from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Status
from app.service import user_service

statusRouter = APIRouter(prefix="/status", dependencies=[Depends(user_service.get_current_auth_user)])

@statusRouter.get("/", tags=["Status"])
async def retrieve_status(session: Annotated[AsyncSession, Depends(getSession)]):
    statuses = await session.scalars(select(Status))
    return {"Status": statuses.all()}

@statusRouter.get("/{status_id}", tags=["Status"])
async def retrieve_status_by_id(status_id: int):
    pass

@statusRouter.post("/", tags=["Status"])
async def create_status():
    pass

@statusRouter.put("/{status_id}", tags=["Status"])
async def update_status(status_id: int):
    pass

@statusRouter.delete("/{status_id}", tags=["Status"])
async def delete_status(status_id: int):
    pass
