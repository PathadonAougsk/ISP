from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.dependencies import supabase
from app.model import Account, Role

bearer_scheme = HTTPBearer()

DEFAULT_ROLE_NAME = "member"


def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthUser:
    response = supabase.auth.get_user(credentials.credentials)
    if response is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return response.user


async def create_account(session: AsyncSession, id: str, email: str, username: str) -> Account:
    role_id = await session.scalar(select(Role.id).where(Role.name == DEFAULT_ROLE_NAME))
    stmt = (
        insert(Account)
        .values(id=id, email=email, username=username, role_id=role_id)
        .on_conflict_do_nothing(index_elements=[Account.id])
        .returning(Account)
    )
    account = await session.scalar(stmt)
    if account is None:
        account = await session.get(Account, id)
    await session.commit()
    return account
