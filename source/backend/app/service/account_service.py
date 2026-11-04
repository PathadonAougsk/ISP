import logging
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.errors import AuthApiError, AuthError
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.dependencies import supabase
from app.model import Account, AccountRole, AuditLog

logger = logging.getLogger(__name__)

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


async def assert_login_available(
    session: AsyncSession, username: str, email: str
) -> None:
    """Checked before the auth user exists, so the usual clash never leaves a
    Supabase login behind that we then have to delete again."""
    clash = await session.scalar(
        select(Account).where(
            or_(Account.username == username, Account.email == email)
        )
    )
    if clash is None:
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "That username is already taken"
            if clash.username == username
            else f"{email} already belongs to {clash.username}"
        ),
    )


async def create_auth_user(email: str, password: str, username: str) -> uuid.UUID:
    """The Supabase half of creating a member. `email_confirm` marks the
    address confirmed on the spot: there is no invite mail to click, the admin
    hands the password over themselves.

    The supabase client is blocking, so it goes to the threadpool rather than
    stalling the event loop."""
    try:
        response = await run_in_threadpool(
            supabase.auth.admin.create_user,
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"username": username},
            },
        )
    except AuthApiError as exc:
        # Weak passwords and addresses already in auth.users land here. The
        # message is Supabase's own ("Password should be at least ..."), and it
        # is the only hint the admin gets, so pass it through.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Supabase rejected that login: {exc.message}",
        ) from exc

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase did not return the new user",
        )

    return uuid.UUID(response.user.id)


async def delete_auth_user(user_id: uuid.UUID) -> None:
    """Undo create_auth_user. Only this request knows the new id, so if the
    account insert fails we have to take the login back out here or it becomes
    a user nobody can see in the member list or sign in as anybody."""
    try:
        await run_in_threadpool(supabase.auth.admin.delete_user, str(user_id))
    except Exception:
        # Already failing the request, so log and let the original error stand.
        logger.exception("Could not roll back orphaned auth user %s", user_id)
