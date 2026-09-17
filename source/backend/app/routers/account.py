from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account
from app.service import account_service

accountRouter = APIRouter(prefix="/account", dependencies=[Depends(account_service.get_current_auth_user)])


class CreateAccountRequest(BaseModel):
    username: str


@accountRouter.get("/", tags=["Account"])
async def retrieve_accounts(session : Annotated[AsyncSession, Depends(getSession)]):
    accounts = await session.scalars(select(Account))
    return { "Accounts" : accounts.all()}

@accountRouter.post("/", tags=["Account"])
async def create_account(
    body: CreateAccountRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
    auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)],
):
    return await account_service.create_account(session, auth_user.id, auth_user.email, body.username)

@accountRouter.get("/{account_id}", tags=["Account"])
async def retrieve_account(account_id: str):
    pass

@accountRouter.put("/{account_id}", tags=["Account"])
async def update_account(account_id: str):
    pass

@accountRouter.delete("/{account_id}", tags=["Account"])
async def delete_account(account_id: str):
    pass

@accountRouter.post("/admin", tags=["Admin"])
async def admin_create_account():
    pass

@accountRouter.put("/{account_id}/role", tags=["Admin"])
async def assign_role(account_id: str, role_id: int):
    pass
