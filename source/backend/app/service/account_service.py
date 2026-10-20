import uuid
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError, PyJWKClientConnectionError
from pydantic import BaseModel, Field
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.dependencies import jwks_client, jwt_issuer
from app.model import Account, AccountRole, AuditLog

bearer_scheme = HTTPBearer(auto_error=False, description="Supabase access token")

# Supabase signs access tokens with an asymmetric key, but accept RS256 too so
# a project switching key type does not lock everyone out.
JWT_ALGORITHMS = ["ES256", "RS256"]

# Every Supabase access token carries this audience.
JWT_AUDIENCE = "authenticated"

UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)

INVALID_TOKEN = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


class AuthUser(BaseModel):
    id: str = Field(validation_alias="sub")
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    session_id: str | None = None
    is_anonymous: bool = False
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    user_metadata: dict[str, Any] = Field(default_factory=dict)


def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthUser:
    if credentials is None:
        raise UNAUTHENTICATED
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=JWT_ALGORITHMS,
            audience=JWT_AUDIENCE,
            issuer=jwt_issuer,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except PyJWKClientConnectionError as exc:
        # We could not reach the key set, so we cannot say the token is bad.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify the access token right now",
        ) from exc
    except InvalidTokenError as exc:
        raise INVALID_TOKEN from exc
    except jwt.PyJWTError as exc:
        # No key matches the token's kid - it was not signed for this project.
        raise INVALID_TOKEN from exc
    return AuthUser.model_validate(claims)


ADMIN_ROLES = frozenset({AccountRole.LAB_OWNER, AccountRole.LAB_ADMIN})


def is_admin(account: Account) -> bool:
    return account.role in ADMIN_ROLES


async def get_current_account(
    auth_user: Annotated[AuthUser, Depends(get_current_auth_user)],
    session: Annotated[AsyncSession, Depends(getSession)],
) -> Account:
    account = await session.get(Account, auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account

async def require_admin(
    me: Annotated[Account, Depends(get_current_account)],
) -> Account:
    if not is_admin(me):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Lab Owner or Lab Admin can do this",
        )
    return me


async def get_account_or_404(session: AsyncSession, account_id: uuid.UUID) -> Account:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )
    return account


def audit_account(
    session: AsyncSession,
    account_id: uuid.UUID,
    column: str,
    old_value: object,
    new_value: object,
    by_whom: uuid.UUID,
) -> None:
    session.add(
        AuditLog(
            from_table="account",
            row_id=str(account_id),
            column_name=column,
            old_value=None if old_value is None else str(old_value),
            new_value=None if new_value is None else str(new_value),
            by_whom=by_whom,
        )
    )
