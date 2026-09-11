from typing import Annotated

from fastapi import Cookie, HTTPException, status
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.dependencies import supabase
from app.model import Account


def get_current_auth_user(jwt: Annotated[str | None, Cookie()] = None) -> AuthUser:
    if jwt is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    response = supabase.auth.get_user(jwt)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return response.user


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
