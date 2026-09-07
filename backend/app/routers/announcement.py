from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Announcement
from app.service import user_service

announcementRouter = APIRouter(prefix="/announcement", dependencies=[Depends(user_service.get_current_auth_user)])

@announcementRouter.get("/", tags=["Announcement"])
async def retrieve_announcements(session: Annotated[AsyncSession, Depends(getSession)]):
    announcements = await session.scalars(select(Announcement))
    return {"Announcements": announcements.all()}

@announcementRouter.get("/{announcement_id}", tags=["Announcement"])
async def retrieve_announcement(announcement_id: int):
    pass

@announcementRouter.post("/", tags=["Announcement"])
async def create_announcement():
    pass

@announcementRouter.put("/{announcement_id}", tags=["Announcement"])
async def update_announcement(announcement_id: int):
    pass

@announcementRouter.delete("/{announcement_id}", tags=["Announcement"])
async def delete_announcement(announcement_id: int):
    pass
