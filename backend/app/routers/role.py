from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Role
from app.service import user_service

roleRouter = APIRouter(prefix="/role", dependencies=[Depends(user_service.get_current_auth_user)])

@roleRouter.get("/", tags=["Role"])
async def retrieve_roles(session: Annotated[AsyncSession, Depends(getSession)]):
    roles = await session.scalars(select(Role))
    return {"Roles": roles.all()}

@roleRouter.get("/{role_id}", tags=["Role"])
async def retrieve_role(role_id: int):
    pass

@roleRouter.post("/", tags=["Role"])
async def create_role():
    pass

@roleRouter.put("/{role_id}", tags=["Role"])
async def update_role(role_id: int):
    pass

@roleRouter.delete("/{role_id}", tags=["Role"])
async def delete_role(role_id: int):
    pass
