import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
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
async def retrieve_account(
    account_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    # Your own account is always readable. everyone else's is admin only.
    if me.id != account_id and not account_service.is_admin(me):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this account",
        )

    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )

    return {"Account": account}

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
