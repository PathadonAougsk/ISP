from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account
from app.service import user_service

userRouter = APIRouter(prefix="/user", dependencies=[Depends(user_service.get_current_auth_user)])


class CreateUserRequest(BaseModel):
    username: str


@userRouter.get("/", tags=["User"])
async def retrieve_users(session : Annotated[AsyncSession, Depends(getSession)]):
    accounts = await session.scalars(select(Account))
    return { "Users" : accounts.all()}

@userRouter.post("/", tags=["User"])
async def create_user(
    body: CreateUserRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
    auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)],
):
    return await user_service.create_account(session, auth_user.id, auth_user.email, body.username)

@userRouter.get("/{user_id}", tags=["User"])
async def retrieve_user(user_id: str):
    pass

@userRouter.put("/{user_id}", tags=["User"])
async def update_user(user_id: str):
    pass

@userRouter.delete("/{user_id}", tags=["User"])
async def delete_user(user_id: str):
    pass

@userRouter.post("/admin", tags=["Admin"])
async def admin_create_user():
    pass

@userRouter.put("/{user_id}/role", tags=["Admin"])
async def assign_role(user_id: str, role_id: int):
    pass
