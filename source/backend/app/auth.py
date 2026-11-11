"""Who is calling, read from the access token itself.

Every request used to cost a round trip to Supabase's /auth/v1/user just to
learn the caller's id. The token already carries it and Supabase signs it, so
we check that signature here instead and only fetch the project's public keys
from Supabase - once, cached, and shared by every request after that.

What that trades away: a token is good until it expires, even if the session
behind it was signed out in the meantime, because nothing asks Supabase any
more. Nothing else loosens - get_current_account still reads the account row
on every request, so a deactivated or deleted member is turned away on the
spot.
"""

import logging
import os
from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWKClientError,
)

logger = logging.getLogger(__name__)

load_dotenv()

_url: str | None = os.environ.get("SUPABASE_URL")
if not _url:
    raise ValueError("SUPABASE_URL is missing from .env")

AUTH_URL = f"{_url.rstrip('/')}/auth/v1"
# Both are fixed by Supabase: it signs with this issuer and stamps every user
# token for this audience. Checking them stops a token minted by some other
# project, or a service key, from passing as one of our members.
ISSUER = AUTH_URL
AUDIENCE = "authenticated"
JWKS_URL = f"{AUTH_URL}/.well-known/jwks.json"

# The algorithms a Supabase signing key can use. The private half never leaves
# Supabase, so these are the ones we can check against the published JWKS.
ASYMMETRIC_ALGORITHMS = ("ES256", "RS256", "EdDSA")
# A project still on the old shared secret signs with HS256 instead, and there
# is nothing to publish - verifying those needs the secret itself. Ours is on
# a signing key, so this stays unset unless somebody moves it back.
LEGACY_SECRET: str | None = os.environ.get("SUPABASE_JWT_SECRET") or None

# Supabase's clock and ours are not the same clock, and a token that went
# stale a couple of seconds ago by our reckoning is not worth a 401.
LEEWAY_SECONDS = 10

# The keys outlive any one token, so refetching them per request would only
# move the round trip we are removing. A new key shows up within the lifespan,
# and a token signed by one we have not seen yet fetches it on the spot.
_jwks_client = PyJWKClient(JWKS_URL, lifespan=600, timeout=10)

bearer_scheme = HTTPBearer(auto_error=False, description="Supabase access token")


def unauthenticated(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


UNAUTHENTICATED = unauthenticated("Not authenticated")


@dataclass(frozen=True, slots=True)
class AuthUser:
    """The signed in user as the token describes them.

    The same two fields the Supabase client used to hand back, so the routers
    read it the same way. `claims` is the rest of the payload, for anything
    that wants a claim we have not named."""

    id: str
    email: str | None
    claims: dict[str, Any]


def _signing_key(algorithm: str | None, token: str) -> Any:
    """The key to check this token with, chosen by how it says it was signed.

    The algorithm we then verify under is pinned to the key we picked, never
    to whatever the header asked for: letting a header name HS256 while we
    hand over an RSA public key is how the classic confusion attack gets a
    forged token accepted, since that public key is published."""
    if algorithm in ASYMMETRIC_ALGORITHMS:
        return _jwks_client.get_signing_key_from_jwt(token).key
    if algorithm == "HS256":
        if LEGACY_SECRET is None:
            raise InvalidTokenError(
                "Token is signed with the legacy shared secret, which this "
                "server does not have (set SUPABASE_JWT_SECRET)"
            )
        return LEGACY_SECRET
    raise InvalidTokenError(f"Unsupported signing algorithm {algorithm!r}")


def decode_token(token: str) -> dict[str, Any]:
    """The token's claims, or InvalidTokenError if it is not one of ours.

    Blocking: the first token after a restart, and any token with an unknown
    key id, fetches the JWKS over the network."""
    algorithm = jwt.get_unverified_header(token).get("alg")
    key = _signing_key(algorithm, token)
    return jwt.decode(
        token,
        key,
        algorithms=[algorithm],
        audience=AUDIENCE,
        issuer=ISSUER,
        leeway=LEEWAY_SECONDS,
        # Supabase always sends all three. Requiring them keeps a token that
        # happens to verify but says nothing useful from reaching a handler.
        options={"require": ["exp", "sub", "aud"]},
    )


async def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthUser:
    if credentials is None:
        raise UNAUTHENTICATED

    try:
        claims = await run_in_threadpool(decode_token, credentials.credentials)
    except PyJWKClientConnectionError as exc:
        # We could not reach Supabase for the keys. That is our outage, not a
        # bad token, and saying 401 would send the frontend off to sign in again.
        logger.exception("Could not fetch the Supabase JWKS")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot verify logins right now, try again shortly",
        ) from exc
    except (PyJWKClientError, InvalidTokenError) as exc:
        # Either none of the published keys signed this token, or it is not
        # one of ours at all: expired, forged, or minted for another project.
        raise unauthenticated("Invalid or expired token") from exc

    # Anonymous sign in is off and every member is created by an admin, so a
    # token with no real user behind it has no business here.
    if claims.get("is_anonymous"):
        raise unauthenticated("Anonymous sessions cannot use this API")

    return AuthUser(
        id=str(claims["sub"]),
        email=claims.get("email") or None,
        claims=claims,
    )
