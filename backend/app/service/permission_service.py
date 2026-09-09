from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Permission

async def get_permission_or_404(session: AsyncSession, permission_id: int) -> Permission:
    target = await session.scalar(select(Permission).where(Permission.id == permission_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Permission with id {permission_id} not found")
    return target
