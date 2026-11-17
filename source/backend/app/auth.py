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
ISSUER = AUTH_URL
AUDIENCE = "authenticated"
JWKS_URL = f"{AUTH_URL}/.well-known/jwks.json"

ASYMMETRIC_ALGORITHMS = ("ES256", "RS256", "EdDSA")
LEGACY_SECRET: str | None = os.environ.get("SUPABASE_JWT_SECRET") or None

LEEWAY_SECONDS = 10

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
    id: str
    email: str | None
    claims: dict[str, Any]


def _signing_key(algorithm: str | None, token: str) -> Any:
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
