from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account
from app.service import user_service

userRouter = APIRouter(prefix="/user", dependencies=[Depends(user_service.get_current_auth_user)])

@userRouter.get("/", tags=["User"])
async def retrieve_users(session : Annotated[AsyncSession, Depends(getSession)]):
    accounts = await session.scalars(select(Account))
    return { "Users" : accounts.all()}

@userRouter.post("/", tags=["User"])
async def create_user(
    session: Annotated[AsyncSession, Depends(getSession)],
    auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)],
):
    return await user_service.create_account(session, auth_user.id, auth_user.email)
