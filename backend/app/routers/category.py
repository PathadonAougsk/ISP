from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Category
from app.service import user_service

categoryRouter = APIRouter(prefix="/category", dependencies=[Depends(user_service.get_current_auth_user)])

@categoryRouter.get("/", tags=["Category"])
async def retrieve_categories(session: Annotated[AsyncSession, Depends(getSession)]):
    categories = await session.scalars(select(Category))
    return {"Categories": categories.all()}
