import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import getSession
from app.model import Account, AuditLog
from app.service import account_service

auditLogRouter = APIRouter(prefix="/audit-log", dependencies=[Depends(account_service.get_current_auth_user)])


def serialize_audit_log(entry: AuditLog) -> dict[str, Any]:
    """The log is read by username, so flatten the actor onto the row - a uuid
    on its own tells a reader nothing. None means the account was deleted."""
    return {
        "id": entry.id,
        "from_table": entry.from_table,
        "row_id": entry.row_id,
        "column_name": entry.column_name,
        "old_value": entry.old_value,
        "new_value": entry.new_value,
        "by_whom": entry.by_whom,
        "by_username": entry.actor.username if entry.actor is not None else None,
        "occurred_at": entry.occurred_at,
    }


@auditLogRouter.get("/", tags=["AuditLog"])
async def retrieve_audit_logs(
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)],
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
    from_table: Annotated[str | None, Query(max_length=64)] = None,
    row_id: Annotated[str | None, Query(max_length=36)] = None,
    by_whom: uuid.UUID | None = None,
):
    """Newest first - a change history is read from the most recent change back.
    The log spans every table, so it is Lab Owner and Lab Admin only."""
    statement = (
        select(AuditLog)
        .options(joinedload(AuditLog.actor))
        .order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
    )

    if from_table is not None:
        statement = statement.where(AuditLog.from_table == from_table)
    if row_id is not None:
        statement = statement.where(AuditLog.row_id == row_id)
    if by_whom is not None:
        statement = statement.where(AuditLog.by_whom == by_whom)

    audit_logs = await session.scalars(statement.limit(limit).offset(offset))
    return {"AuditLogs": [serialize_audit_log(entry) for entry in audit_logs.all()]}


@auditLogRouter.get("/{audit_log_id}", tags=["AuditLog"])
async def retrieve_audit_log(
    audit_log_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)],
):
    statement = (
        select(AuditLog).options(joinedload(AuditLog.actor)).where(AuditLog.id == audit_log_id)
    )
    entry = await session.scalar(statement)

    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log with id {audit_log_id} not found",
        )

    return {"AuditLog": serialize_audit_log(entry)}
