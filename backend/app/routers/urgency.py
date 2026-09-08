from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Urgency
from app.service import user_service

urgencyRouter = APIRouter(prefix="/urgency", dependencies=[Depends(user_service.get_current_auth_user)])

@urgencyRouter.get("/", tags=["Urgency"])
async def retrieve_urgency(session: Annotated[AsyncSession, Depends(getSession)]):
    urgencies = await session.scalars(select(Urgency))
    return {"Urgency": urgencies.all()}

@urgencyRouter.get("/{urgency_id}", tags=["Urgency"])
async def retrieve_urgency_by_id(urgency_id: int):
    pass

@urgencyRouter.post("/", tags=["Urgency"])
async def create_urgency():
    pass

@urgencyRouter.put("/{urgency_id}", tags=["Urgency"])
async def update_urgency(urgency_id: int):
    pass

@urgencyRouter.delete("/{urgency_id}", tags=["Urgency"])
async def delete_urgency(urgency_id: int):
    pass
