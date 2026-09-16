from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import AuditLog
from app.service import user_service

auditLogRouter = APIRouter(prefix="/audit-log", dependencies=[Depends(user_service.get_current_auth_user)])

@auditLogRouter.get("/", tags=["AuditLog"])
async def retrieve_audit_logs(session: Annotated[AsyncSession, Depends(getSession)]):
    audit_logs = await session.scalars(select(AuditLog))
    return {"AuditLogs": audit_logs.all()}

@auditLogRouter.get("/{audit_log_id}", tags=["AuditLog"])
async def retrieve_audit_log(audit_log_id: int):
    pass
