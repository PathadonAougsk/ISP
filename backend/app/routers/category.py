from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Category
from app.service import category_service, user_service

categoryRouter = APIRouter(prefix="/category", dependencies=[Depends(user_service.get_current_auth_user)])

class ReqBody(BaseModel):
    name : str

@categoryRouter.get("/", tags=["Category"])
async def retrieve_categories(session: Annotated[AsyncSession, Depends(getSession)]):
    categories = await session.scalars(select(Category))
    return {"Categories": categories.all()}

@categoryRouter.get("/{category_id}", tags=["Category"])
async def retrieve_category(category_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    category = await category_service.get_category_or_404(session, category_id)
    return {"Category" : category}

@categoryRouter.post("/", tags=["Category"])
async def create_category(ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    newCategory = Category(name=ReqBody.name)
    session.add(newCategory)
    await session.commit()
    await session.refresh(Category)
    return {"Message" : "Succesfuly Create new category"}

@categoryRouter.put("/{category_id}", tags=["Category"])
async def update_category(category_id: int, ReqBody : ReqBody, session: Annotated[AsyncSession, Depends(getSession)]):
    targetCategory = await category_service.get_category_or_404(session, category_id)
    targetCategory.name = ReqBody.name
    await session.commit()
    await session.refresh(Category)
    return {"Message" : f"Succesfuly update {ReqBody.name} category"}

@categoryRouter.delete("/{category_id}", tags=["Category"])
async def delete_category(category_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    targetCategory = await category_service.get_category_or_404(session, category_id)
    await session.delete(targetCategory)
    await session.commit()
    await session.refresh(Category)
    return {"Message" : "Succesfuly delete category"}
