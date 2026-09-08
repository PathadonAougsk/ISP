from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Status

async def get_status_or_404(session: AsyncSession, status_id: int) -> Status:
    target = await session.scalar(select(Status).where(Status.id == status_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Couldnt find status")
    return target
