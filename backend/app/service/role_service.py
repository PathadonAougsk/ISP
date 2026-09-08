from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Role

async def get_role_or_404(session: AsyncSession, role_id: int) -> Role:
    target = await session.scalar(select(Role).where(Role.id == role_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Couldnt find role")
    return target
