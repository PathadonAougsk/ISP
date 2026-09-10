from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.dependencies import supabase
from app.model import Account

bearer_scheme = HTTPBearer()


def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthUser:
    response = supabase.auth.get_user(credentials.credentials)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return response.user


async def create_account(session: AsyncSession, id: str, email: str, username: str) -> Account:
    stmt = (
        insert(Account)
        .values(id=id, email=email, username=username)
        .on_conflict_do_nothing(index_elements=[Account.id])
        .returning(Account)
    )
    account = await session.scalar(stmt)
    if account is None:
        account = await session.get(Account, id)
    await session.commit()
    return account
