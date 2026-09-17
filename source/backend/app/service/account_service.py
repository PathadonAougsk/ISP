from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.errors import AuthError
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.dependencies import supabase
from app.model import Account

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


async def get_current_account(
    auth_user: Annotated[AuthUser, Depends(get_current_auth_user)],
    session: Annotated[AsyncSession, Depends(getSession)],
) -> Account:
    """The account row behind the logged in user, so we can read their role."""
    account = await session.get(Account, auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


async def create_account(session: AsyncSession, id: str, email: str, username: str) -> Account:
    stmt = (
        insert(Account)
        .values(id=id, email=email, username=username)
    )
    account = await session.scalar(stmt)
    if account is None:
        account = await session.get(Account, id)
    await session.commit()
    return account
