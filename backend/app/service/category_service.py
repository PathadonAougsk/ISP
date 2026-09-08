from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Category

async def get_category_or_404(session: AsyncSession, category_id: int) -> Category:
    target = await session.scalar(select(Category).where(Category.id == category_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Couldnt find category")
    return target
