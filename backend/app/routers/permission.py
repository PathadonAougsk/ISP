from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Permission
from app.service import permission_service, user_service

permissionRouter = APIRouter(prefix="/permission", dependencies=[Depends(user_service.get_current_auth_user)])

class PermissionRequestBody(BaseModel):
    can_edit : bool | None = None
    can_complete : bool | None = None
    can_grant_role : bool | None = None
    can_revoke_role : bool | None = None

@permissionRouter.get("/", tags=["Permission"])
async def retrieve_permissions(session: Annotated[AsyncSession, Depends(getSession)]):
    permissions = await session.scalars(select(Permission))
    return {"Permissions": permissions.all()}

@permissionRouter.get("/{permission_id}", tags=["Permission"])
async def retrieve_permission(permission_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    permission = await permission_service.get_permission_or_404(session, permission_id)
    return {"Permission": permission}

@permissionRouter.post("/", tags=["Permission"])
async def create_permission(body : PermissionRequestBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newPermission = Permission(
        can_edit=body.can_edit,
        can_complete=body.can_complete,
        can_grant_role=body.can_grant_role,
        can_revoke_role=body.can_revoke_role,
    )
    session.add(newPermission)
    await session.commit()
    await session.refresh(newPermission)

    return {"Message" : "Succesfuly Create new permission"}

@permissionRouter.put("/{permission_id}", tags=["Permission"])
async def update_permission(permission_id: int, body : PermissionRequestBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetPermission = await permission_service.get_permission_or_404(session, permission_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(targetPermission, field, value)
    await session.commit()
    await session.refresh(targetPermission)

    return {"Message" : "Succesfuly update permission"}

@permissionRouter.delete("/{permission_id}", tags=["Permission"])
async def delete_permission(permission_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetPermission = await permission_service.get_permission_or_404(session, permission_id)
    await session.delete(targetPermission)
    await session.commit()

    return {"Message" : "Succesfuly delete permission"}
