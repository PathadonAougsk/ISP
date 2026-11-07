from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Announcement, Account, AuditLog
from app.service import account_service


class AnnouncementCreate(BaseModel):
    name: str
    description: str | None = None


class AnnouncementUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


announcementRouter = APIRouter(prefix="/announcement", dependencies=[Depends(account_service.get_current_auth_user)])


@announcementRouter.get("/", tags=["Announcement"])
async def retrieve_announcements(
    session: Annotated[AsyncSession, Depends(getSession)],
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=0, ge=0)
):
    query = select(Announcement).order_by(Announcement.created.desc()).offset(offset)

    if limit:
        query = query.limit(limit)

    announcements = await session.scalars(query)

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
    await session.refresh(announcement)

    return announcement


@announcementRouter.put("/{announcement_id}", tags=["Announcement"])
async def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    announcement = await session.get(Announcement, announcement_id)

    if announcement is None:
        raise HTTPException(
            status_code=404,
            detail=f"Announcement not found"
        )

    def update_announcement_log(col_name, old_val, new_value):
        al = AuditLog(
            from_table="announcement",
            row_id=str(announcement.id),
            column_name=col_name,
            old_value=f"{old_val}" if old_val is not None else None,
            new_value=f"{new_value}" if new_value is not None else None,
            by_whom=me.id
        )

        if al.old_value == al.new_value:
            return 0
        else:
            return al

    audit_list = []

    if data.name is not None:
        audit_list.append(
            update_announcement_log("name", announcement.name, data.name)
        )
        announcement.name = data.name

    description_changed = update_announcement_log("description", announcement.description, data.description)
    if (description_changed):
        audit_list.append(description_changed)
        announcement.description = data.description

    for i in audit_list:
        session.add(i)

    await session.commit()
    await session.refresh(announcement)

    return announcement


@announcementRouter.delete("/{announcement_id}", tags=["Announcement"])
async def delete_announcement(
    announcement_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)]
):
    announcement = await session.get(Announcement, announcement_id)

    if announcement is None:
        raise HTTPException(
            status_code=404,
            detail="Announcement not found"
        )

    name_audit = AuditLog(
        from_table="announcement",
        row_id=str(announcement.id),
        column_name="name",
        old_value=announcement.name,
        new_value=None,
        by_whom=me.id
    )

    description_audit = AuditLog(
        from_table="announcement",
        row_id=str(announcement.id),
        column_name="description",
        old_value=announcement.description,
        new_value=None,
        by_whom=me.id
    )

    session.add(name_audit)
    session.add(description_audit)

    await session.delete(announcement)
    await session.commit()

    return {"message": "Announcement deleted successfully"}
