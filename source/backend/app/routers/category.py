from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.limits import CATEGORY_NAME_MAX
from app.model import Account, Category
from app.service import category_service, account_service

categoryRouter = APIRouter(prefix="/category", dependencies=[Depends(account_service.get_current_auth_user)])

class CategoryRequestBody(BaseModel):
    name : str = Field(min_length=1, max_length=CATEGORY_NAME_MAX)

NAME_TAKEN = HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="That category name is already taken",
)

@categoryRouter.get("/", tags=["Category"])
async def retrieve_categories(session: Annotated[AsyncSession, Depends(getSession)]):
    categories = await session.scalars(select(Category))
    return {"Categories": categories.all()}

@categoryRouter.get("/{category_id}", tags=["Category"])
async def retrieve_category(category_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    category = await category_service.get_category_or_404(session, category_id)
    return {"Category" : category}

@categoryRouter.post("/", tags=["Category"])
async def create_category(body : CategoryRequestBody, session: Annotated[AsyncSession, Depends(getSession)], me: Annotated[Account, Depends(account_service.require_admin)]):
    newCategory = Category(name=body.name)
    session.add(newCategory)
    try:
        await session.flush()
        category_service.audit_category(session, newCategory.id, "name", None, newCategory.name, me.id)
        await session.commit()
    except IntegrityError as exc:
        # category_name_key: the name is UNIQUE.
        await session.rollback()
        raise NAME_TAKEN from exc
    await session.refresh(newCategory)
    return {"Message" : "Succesfuly Create new category"}

@categoryRouter.put("/{category_id}", tags=["Category"])
async def update_category(category_id: int, body : CategoryRequestBody, session: Annotated[AsyncSession, Depends(getSession)], me: Annotated[Account, Depends(account_service.require_admin)]):
    targetCategory = await category_service.get_category_or_404(session, category_id)
    previousName = targetCategory.name
    targetCategory.name = body.name
    if previousName != body.name:
        category_service.audit_category(session, category_id, "name", previousName, body.name, me.id)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise NAME_TAKEN from exc
    await session.refresh(targetCategory)
    return {"Message" : f"Succesfuly update {body.name} category"}

@categoryRouter.delete("/{category_id}", tags=["Category"])
async def delete_category(category_id: int, session: Annotated[AsyncSession, Depends(getSession)], me: Annotated[Account, Depends(account_service.require_admin)]):
    targetCategory = await category_service.get_category_or_404(session, category_id)
    # Read before the commit: a rollback expires the row and the name is gone.
    name = targetCategory.name
    category_service.audit_category(session, category_id, "name", name, None, me.id)
    await session.delete(targetCategory)
    try:
        await session.commit()
    except IntegrityError as exc:
        # category_id on ticket and task is ON DELETE RESTRICT.
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{name} still has tickets or tasks. Move them first.",
        ) from exc
    return {"Message" : "Succesfuly delete category"}
