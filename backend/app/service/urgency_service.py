from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Urgency

async def get_urgency_or_404(session: AsyncSession, urgency_id: int) -> Urgency:
    target = await session.scalar(select(Urgency).where(Urgency.id == urgency_id))
    if target is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Urgency with id {urgency_id} not found")
    return target
