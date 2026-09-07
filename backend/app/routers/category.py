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

@categoryRouter.get("/{category_id}", tags=["Category"])
async def retrieve_category(category_id: int):
    pass

@categoryRouter.post("/", tags=["Category"])
async def create_category():
    pass

@categoryRouter.put("/{category_id}", tags=["Category"])
async def update_category(category_id: int):
    pass

@categoryRouter.delete("/{category_id}", tags=["Category"])
async def delete_category(category_id: int):
    pass
