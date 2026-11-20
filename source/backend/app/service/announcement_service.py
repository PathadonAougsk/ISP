from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model import Announcement, Account, AuditLog


async def retrieve_announcements(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 0
):
    query = (
        select(Announcement)
        .order_by(Announcement.created.desc())
        .offset(offset)
    )

    if limit:
        query = query.limit(limit)

    announcements = await session.scalars(query)

    return {"Announcements": announcements.all()}


async def create_announcement(
    session: AsyncSession,
    me: Account,
    data
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


async def update_announcement(
    session: AsyncSession,
    me: Account,
    announcement_id: int,
    data
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
    # only fields sent get touched. description null = clear it
    sent = data.model_fields_set

    if "name" in sent and data.name is not None:
        name_changed = update_announcement_log(
            "name",
            announcement.name,
            data.name
        )

        if name_changed:
            audit_list.append(name_changed)

        announcement.name = data.name

    if "description" in sent:
        description_changed = update_announcement_log(
            "description",
            announcement.description,
            data.description
        )

        if description_changed:
            audit_list.append(description_changed)
            announcement.description = data.description

    for i in audit_list:
        session.add(i)

    await session.commit()
    await session.refresh(announcement)

    return announcement


async def delete_announcement(
    session: AsyncSession,
    me: Account,
    announcement_id: int
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
