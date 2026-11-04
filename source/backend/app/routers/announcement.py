from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Announcement, Account, AuditLog
from app.service import account_service

class AnnouncementCreate(BaseModel):
    name: str
    description: str | None = None

announcementRouter = APIRouter(prefix="/announcement", dependencies=[Depends(account_service.get_current_auth_user)])

@announcementRouter.get("/", tags=["Announcement"])
async def retrieve_announcements(session: Annotated[AsyncSession, Depends(getSession)]):
    announcements = await session.scalars(select(Announcement).order_by(Announcement.created.desc()))

    return {"Announcements": announcements.all()}

@announcementRouter.post("/", tags=["Announcement"])
async def create_announcement(
    data: AnnouncementCreate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    announcement = Announcement(
        name=data.name,
        description=data.description,
        created_by=me.id
    )

    session.add(announcement)
    await session.flush()

    name_audit = AuditLog(
        from_table="announcement",
        row_id=str(announcement.id),
        column_name="name",
        old_value=None,
        new_value=announcement.name,
        by_whom=me.id
    )

    description_audit = AuditLog(
        from_table="announcement",
        row_id=str(announcement.id),
        column_name="description",
        old_value=None,
        new_value=announcement.description,
        by_whom=me.id
    )

    session.add(name_audit)
    session.add(description_audit)

    await session.commit()

    return announcement

@announcementRouter.put("/{announcement_id}", tags=["Announcement"])
async def update_announcement(announcement_id: int):
    pass

@announcementRouter.delete("/{announcement_id}", tags=["Announcement"])
async def delete_announcement(announcement_id: int):
    pass
