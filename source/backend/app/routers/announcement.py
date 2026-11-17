from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_auth_user
from app.database import getSession
from app.limits import DESCRIPTION_MAX, NAME_MAX
from app.model import Account
from app.service import account_service, announcement_service


class AnnouncementCreate(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)


class AnnouncementUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)


announcementRouter = APIRouter(
    prefix="/announcement",
    dependencies=[Depends(get_current_auth_user)]
)


@announcementRouter.get("/", tags=["Announcement"])
async def retrieve_announcements(
    session: Annotated[AsyncSession, Depends(getSession)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=0, ge=0)
):
    return await announcement_service.retrieve_announcements(
        session=session,
        offset=offset,
        limit=limit
    )


@announcementRouter.post("/", tags=["Announcement"])
async def create_announcement(
    data: AnnouncementCreate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    return await announcement_service.create_announcement(
        session=session,
        me=me,
        data=data
    )


@announcementRouter.put("/{announcement_id}", tags=["Announcement"])
async def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    return await announcement_service.update_announcement(
        session=session,
        me=me,
        announcement_id=announcement_id,
        data=data
    )


@announcementRouter.delete("/{announcement_id}", tags=["Announcement"])
async def delete_announcement(
    announcement_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    return await announcement_service.delete_announcement(
        session=session,
        me=me,
        announcement_id=announcement_id
    )
