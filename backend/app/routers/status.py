from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Status
from app.service import status_service, user_service

class ReqBody(BaseModel):
    id : str | None
    name : str

statusRouter = APIRouter(prefix="/status", dependencies=[Depends(user_service.get_current_auth_user)])

@statusRouter.get("/", tags=["Status"])
async def retrieve_status(session: Annotated[AsyncSession, Depends(getSession)]):
    statuses = await session.scalars(select(Status))
    return {"Status": statuses.all()}

@statusRouter.get("/{status_id}", tags=["Status"])
async def retrieve_status_by_id(status_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    target = await status_service.get_status_or_404(session, status_id)
    return {"Status": target}

@statusRouter.post("/", tags=["Status"])
async def create_status(ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newStatus = Status(name=ReqBody.name)
    session.add(newStatus)
    await session.commit()
    return {"Message" : "Succesfuly Create new status"}


@statusRouter.put("/{status_id}", tags=["Status"])
async def update_status(status_id: int, ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetStatus = await status_service.get_status_or_404(session, status_id)
    targetStatus.name = ReqBody.name
    await session.commit()

    return {"Message" : f"Succesfuly update {ReqBody.name} category"}

@statusRouter.delete("/{status_id}", tags=["Status"])
async def delete_status(status_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetStatus = await status_service.get_status_or_404(session, status_id)
    await session.delete(targetStatus)
    await session.commit()

    return {"Message" : "Succesfuly delete status"}
