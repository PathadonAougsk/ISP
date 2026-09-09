from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Role
from app.service import role_service, user_service

roleRouter = APIRouter(prefix="/role", dependencies=[Depends(user_service.get_current_auth_user)])

class ReqBody(BaseModel):
    name : str
    description : str
    permission_id : int

@roleRouter.get("/", tags=["Role"])
async def retrieve_roles(session: Annotated[AsyncSession, Depends(getSession)]):
    roles = await session.scalars(select(Role))
    return {"Roles": roles.all()}

@roleRouter.get("/{role_id}", tags=["Role"])
async def retrieve_role(role_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    role = await role_service.get_role_or_404(session, role_id)
    return {"Role": role}

@roleRouter.post("/", tags=["Role"])
async def create_role(ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newRole = Role(name=ReqBody.name, description=ReqBody.description, permission_id=ReqBody.permission_id)
    session.add(newRole)
    await session.commit()
    await session.refresh(Role)
    return {"Message" : "Succesfuly Create new role"}

@roleRouter.put("/{role_id}", tags=["Role"])
async def update_role(role_id: int, ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetRole = await role_service.get_role_or_404(session, role_id)
    targetRole.name = ReqBody.name
    targetRole.description = ReqBody.description
    targetRole.permission_id = ReqBody.permission_id
    await session.commit()
    await session.refresh(Role)

    return {"Message" : f"Succesfuly update {ReqBody.name} role"}

@roleRouter.delete("/{role_id}", tags=["Role"])
async def delete_role(role_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetRole = await role_service.get_role_or_404(session, role_id)
    await session.delete(targetRole)
    await session.commit()
    await session.refresh(Role)

    return {"Message" : "Succesfuly delete role"}
