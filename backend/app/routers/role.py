from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Role
from app.service import role_service, user_service

roleRouter = APIRouter(prefix="/role", dependencies=[Depends(user_service.get_current_auth_user)])

class RoleRequestBody(BaseModel):
    name : str | None = None
    description : str | None = None
    permission_id : int | None = None

@roleRouter.get("/", tags=["Role"])
async def retrieve_roles(session: Annotated[AsyncSession, Depends(getSession)]):
    roles = await session.scalars(select(Role))
    return {"Roles": roles.all()}

@roleRouter.get("/{role_id}", tags=["Role"])
async def retrieve_role(role_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    role = await role_service.get_role_or_404(session, role_id)
    return {"Role": role}

@roleRouter.post("/", tags=["Role"])
async def create_role(body : RoleRequestBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newRole = Role(name=body.name, description=body.description, permission_id=body.permission_id)
    session.add(newRole)
    await session.commit()
    await session.refresh(newRole)
    return {"Message" : "Succesfuly Create new role"}

@roleRouter.put("/{role_id}", tags=["Role"])
async def update_role(role_id: int, body : RoleRequestBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetRole = await role_service.get_role_or_404(session, role_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(targetRole, field, value)
    await session.commit()
    await session.refresh(targetRole)

    return {"Message" : f"Succesfuly update {body.name} role"}

@roleRouter.delete("/{role_id}", tags=["Role"])
async def delete_role(role_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetRole = await role_service.get_role_or_404(session, role_id)
    await session.delete(targetRole)
    await session.commit()

    return {"Message" : "Succesfuly delete role"}
