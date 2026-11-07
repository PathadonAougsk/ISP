import uuid

from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import AuditLog, Category

async def get_category_or_404(session: AsyncSession, category_id: int) -> Category:
    target = await session.scalar(select(Category).where(Category.id == category_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Category with id {category_id} not found")
    return target


def audit_category(
    session: AsyncSession,
    category_id: int,
    column: str,
    old_value: object,
    new_value: object,
    by_whom: uuid.UUID,
) -> None:
    session.add(
        AuditLog(
            from_table="category",
            row_id=str(category_id),
            column_name=column,
            old_value=None if old_value is None else str(old_value),
            new_value=None if new_value is None else str(new_value),
            by_whom=by_whom,
        )
    )
