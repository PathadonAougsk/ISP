from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Urgency
from app.service import urgency_service, user_service

urgencyRouter = APIRouter(prefix="/urgency", dependencies=[Depends(user_service.get_current_auth_user)])

class ReqBody(BaseModel):
    id : int | None
    name : str
    priority_rank : int

@urgencyRouter.get("/", tags=["Urgency"])
async def retrieve_urgency(session: Annotated[AsyncSession, Depends(getSession)]):
    urgencies = await session.scalars(select(Urgency))
    return {"Urgency": urgencies.all()}

@urgencyRouter.get("/{urgency_id}", tags=["Urgency"])
async def retrieve_urgency_by_id(urgency_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    urgency = await urgency_service.get_urgency_or_404(session, urgency_id)
    return {"Urgency": urgency}

@urgencyRouter.post("/", tags=["Urgency"])
async def create_urgency(ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newUrgency = Urgency(name=ReqBody.name, priority_rank=ReqBody.priority_rank)
    session.add(newUrgency)
    await session.commit()
    return {"Message" : "Succesfuly Create new urgency"}

@urgencyRouter.put("/{urgency_id}", tags=["Urgency"])
async def update_urgency(urgency_id: int, ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetUrgency = await urgency_service.get_urgency_or_404(session, urgency_id)
    targetUrgency.name = ReqBody.name
    targetUrgency.priority_rank = ReqBody.priority_rank
    await session.commit()

    return {"Message" : f"Succesfuly update {ReqBody.name} urgency"}

@urgencyRouter.delete("/{urgency_id}", tags=["Urgency"])
async def delete_urgency(urgency_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetUrgency = await urgency_service.get_urgency_or_404(session, urgency_id)
    await session.delete(targetUrgency)
    await session.commit()

    return {"Message" : "Succesfuly delete urgency"}
