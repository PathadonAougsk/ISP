"""The token check itself, with no Supabase and no database in reach.

Verifying locally means these rules are ours to get right now, so each one a
forged or stale token could slip through gets its own case. The project's
public keys are the only thing we would fetch, so the tests hand over a key
pair of their own instead of touching the network.
"""

import base64
import hashlib
import hmac
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWKClientError,
)

from app import auth

KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())

USER_ID = "3f1d4a9e-0c7b-4a5e-9d2f-8b6c1e0a7d45"
LEGACY_SECRET = "a-legacy-shared-secret-long-enough-for-sha256"


def claims(**overrides) -> dict:
    """A payload shaped like the one Supabase puts in an access token."""
    now = int(time.time())
    payload = {
        "sub": USER_ID,
        "email": "member@example.com",
        "aud": auth.AUDIENCE,
        "iss": auth.ISSUER,
        "iat": now,
        "exp": now + 3600,
        "role": "authenticated",
    }
    payload.update(overrides)
    return payload


def token(key=KEY, algorithm="ES256", **overrides) -> str:
    return jwt.encode(
        claims(**overrides), key, algorithm=algorithm, headers={"kid": "test-key"}
    )


def _segment(data: bytes) -> bytes:
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def forged_hs256(secret: str, **overrides) -> str:
    """An HS256 token assembled by hand.

    PyJWT will not HMAC with a public key - the same guard from the signing
    side - so a test that wants to try it has to build the token itself."""
    header = _segment(json.dumps({"alg": "HS256", "typ": "JWT", "kid": "test-key"}).encode())
    payload = _segment(json.dumps(claims(**overrides)).encode())
    signing_input = header + b"." + payload
    signature = _segment(
        hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    )
    return (signing_input + b"." + signature).decode()


class FakeJWKS:
    """Stands in for the fetch of the project's published keys."""

    def __init__(self, key=None, error=None):
        self.key = key
        self.error = error
        self.calls = 0

    def get_signing_key_from_jwt(self, _token):
        self.calls += 1
        if self.error is not None:
            raise self.error
        return type("Key", (), {"key": self.key})()


@pytest.fixture(autouse=True)
def jwks(monkeypatch):
    """Our key pair is the project's, and no legacy secret unless a test sets one."""
    fake = FakeJWKS(key=KEY.public_key())
    monkeypatch.setattr(auth, "_jwks_client", fake)
    monkeypatch.setattr(auth, "LEGACY_SECRET", None)
    return fake


@pytest.fixture
def client():
    """One route behind the real dependency, so the HTTP side is tested too."""
    api = FastAPI()

    @api.get("/me")
    def me(user: auth.AuthUser = Depends(auth.get_current_auth_user)):
        return {"id": user.id, "email": user.email}

    with TestClient(api) as tc:
        yield tc


def test_accepts_a_token_this_project_signed():
    assert auth.decode_token(token())["sub"] == USER_ID


def test_rejects_an_expired_token():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(token(exp=int(time.time()) - 300))


def test_leeway_covers_a_little_clock_drift():
    """A token that expired a moment ago by our clock is still taken."""
    just_gone = int(time.time()) - (auth.LEEWAY_SECONDS - 5)
    assert auth.decode_token(token(exp=just_gone))["sub"] == USER_ID


def test_rejects_another_projects_issuer():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(token(iss="https://someone-else.supabase.co/auth/v1"))


def test_rejects_a_token_minted_for_another_audience():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(token(aud="service_role"))


def test_rejects_a_signature_from_a_key_we_do_not_publish():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(token(key=OTHER_KEY))


def test_rejects_a_token_with_no_subject():
    payload = claims()
    del payload["sub"]
    unsigned = jwt.encode(payload, KEY, algorithm="ES256", headers={"kid": "test-key"})
    with pytest.raises(InvalidTokenError):
        auth.decode_token(unsigned)


def test_rejects_hs256_signed_with_our_public_key():
    """The algorithm confusion attack: the header asks for HS256 so that the
    published public key is used as a shared secret instead. We choose the key
    by the algorithm family, so the public key is never an HMAC candidate."""
    public_pem = (
        KEY.public_key()
        .public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    with pytest.raises(InvalidTokenError):
        auth.decode_token(forged_hs256(public_pem))


def test_rejects_an_unsigned_token():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(jwt.encode(claims(), key="", algorithm="none"))


def test_legacy_shared_secret_still_works_when_it_is_configured(monkeypatch):
    """A project moved back to the old HS256 secret keeps working, as long as
    the server has that secret."""
    monkeypatch.setattr(auth, "LEGACY_SECRET", LEGACY_SECRET)
    assert auth.decode_token(forged_hs256(LEGACY_SECRET))["sub"] == USER_ID


def test_legacy_token_is_refused_when_there_is_no_secret():
    with pytest.raises(InvalidTokenError):
        auth.decode_token(forged_hs256(LEGACY_SECRET))


def test_a_valid_token_names_the_caller(client):
    response = client.get("/me", headers={"Authorization": f"Bearer {token()}"})
    assert response.status_code == 200
    assert response.json() == {"id": USER_ID, "email": "member@example.com"}


def test_the_keys_are_not_refetched_for_every_request(client, jwks):
    """The round trip we removed must not come back as a JWKS fetch per call."""
    headers = {"Authorization": f"Bearer {token()}"}
    client.get("/me", headers=headers)
    client.get("/me", headers=headers)
    assert jwks.calls == 2  # one lookup each, and PyJWKClient caches the fetch


def test_a_missing_header_is_401(client):
    assert client.get("/me").status_code == 401


def test_garbage_in_the_header_is_401(client):
    response = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_a_key_we_have_never_seen_is_401(client, jwks):
    jwks.error = PyJWKClientError("no key for that kid")
    response = client.get("/me", headers={"Authorization": f"Bearer {token()}"})
    assert response.status_code == 401


def test_supabase_being_unreachable_is_503_not_401(client, jwks):
    """A 401 would send the frontend off to sign in again over an outage that
    has nothing to do with the caller's token."""
    jwks.error = PyJWKClientConnectionError("cannot reach the JWKS endpoint")
    response = client.get("/me", headers={"Authorization": f"Bearer {token()}"})
    assert response.status_code == 503


def test_an_anonymous_session_is_turned_away(client):
    anonymous = token(is_anonymous=True, email=None)
    response = client.get("/me", headers={"Authorization": f"Bearer {anonymous}"})
    assert response.status_code == 401
