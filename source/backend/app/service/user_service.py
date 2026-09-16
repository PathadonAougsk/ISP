from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.dependencies import supabase
from app.model import Account


def get_current_auth_user(jwt: Annotated[str | None, Cookie()] = None) -> AuthUser:
    if jwt is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    response = supabase.auth.get_user(jwt)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
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
