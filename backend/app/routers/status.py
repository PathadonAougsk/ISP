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
