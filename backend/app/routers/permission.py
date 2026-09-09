from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Permission
from app.service import permission_service, user_service

permissionRouter = APIRouter(prefix="/permission", dependencies=[Depends(user_service.get_current_auth_user)])

class ReqBody(BaseModel):
    can_edit : bool = False
    can_complete : bool = False
    can_grant_role : bool = False
    can_revoke_role : bool = False

@permissionRouter.get("/", tags=["Permission"])
async def retrieve_permissions(session: Annotated[AsyncSession, Depends(getSession)]):
    permissions = await session.scalars(select(Permission))
    return {"Permissions": permissions.all()}

@permissionRouter.get("/{permission_id}", tags=["Permission"])
async def retrieve_permission(permission_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    permission = await permission_service.get_permission_or_404(session, permission_id)
    return {"Permission": permission}

@permissionRouter.post("/", tags=["Permission"])
async def create_permission(ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newPermission = Permission(
        can_edit=ReqBody.can_edit,
        can_complete=ReqBody.can_complete,
        can_grant_role=ReqBody.can_grant_role,
        can_revoke_role=ReqBody.can_revoke_role,
    )
    session.add(newPermission)
    await session.commit()
    await session.refresh(Permission)

    return {"Message" : "Succesfuly Create new permission"}

@permissionRouter.put("/{permission_id}", tags=["Permission"])
async def update_permission(permission_id: int, ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetPermission = await permission_service.get_permission_or_404(session, permission_id)
    targetPermission.can_edit = ReqBody.can_edit
    targetPermission.can_complete = ReqBody.can_complete
    targetPermission.can_grant_role = ReqBody.can_grant_role
    targetPermission.can_revoke_role = ReqBody.can_revoke_role
    await session.commit()
    await session.refresh(Permission)

    return {"Message" : "Succesfuly update permission"}

@permissionRouter.delete("/{permission_id}", tags=["Permission"])
async def delete_permission(permission_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetPermission = await permission_service.get_permission_or_404(session, permission_id)
    await session.delete(targetPermission)
    await session.commit()
    await session.refresh(Permission)

    return {"Message" : "Succesfuly delete permission"}
