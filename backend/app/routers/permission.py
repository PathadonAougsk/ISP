from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Permission
from app.service import user_service

permissionRouter = APIRouter(prefix="/permission", dependencies=[Depends(user_service.get_current_auth_user)])

@permissionRouter.get("/", tags=["Permission"])
async def retrieve_permissions(session: Annotated[AsyncSession, Depends(getSession)]):
    permissions = await session.scalars(select(Permission))
    return {"Permissions": permissions.all()}

@permissionRouter.get("/{permission_id}", tags=["Permission"])
async def retrieve_permission(permission_id: int):
    pass

@permissionRouter.post("/", tags=["Permission"])
async def create_permission():
    pass

@permissionRouter.put("/{permission_id}", tags=["Permission"])
async def update_permission(permission_id: int):
    pass

@permissionRouter.delete("/{permission_id}", tags=["Permission"])
async def delete_permission(permission_id: int):
    pass
