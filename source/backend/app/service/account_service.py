import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.errors import AuthError
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.dependencies import supabase
from app.model import Account, AccountRole, AuditLog

bearer_scheme = HTTPBearer(auto_error=False, description="Supabase access token")

UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)

def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthUser:
    if credentials is None:
        raise UNAUTHENTICATED
    try:
        response = supabase.auth.get_user(credentials.credentials)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if response is None or response.user is None:
        raise UNAUTHENTICATED
    return response.user


ADMIN_ROLES = frozenset({AccountRole.LAB_OWNER, AccountRole.LAB_ADMIN})


def is_admin(account: Account) -> bool:
    return account.role in ADMIN_ROLES


async def get_current_account(
    auth_user: Annotated[AuthUser, Depends(get_current_auth_user)],
    session: Annotated[AsyncSession, Depends(getSession)],
) -> Account:
    """The account row behind the logged in user, so we can read their role."""
    account = await session.get(Account, auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account

async def require_admin(
    me: Annotated[Account, Depends(get_current_account)],
) -> Account:
    """Gate for the admin only endpoints. Returns the caller so handlers can use it."""
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
    """One audit_log row per changed column, matching the task and ticket routers."""
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
