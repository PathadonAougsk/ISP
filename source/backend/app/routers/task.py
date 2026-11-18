import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_auth_user
from app.database import getSession
from app.model import Account, TaskStatus
from app.service import account_service, task_service


TaskRequest = task_service.TaskRequest
TaskUpdate = task_service.TaskUpdate


taskRouter = APIRouter(prefix="/task", dependencies=[Depends(get_current_auth_user)])

# Filter params here are optional. If given none, then get all.
# Filters: id, categories, users (assignees), status, limit
# Admins and the lab owner see every task, a plain lab user only sees their own.


@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(
    me: Annotated[Account, Depends(account_service.get_current_account)],
    session: Annotated[AsyncSession, Depends(getSession)],
    id: int | None = None,
    search: str | None = None,
    categories: int | None = None,
    assignsTo: uuid.UUID | None = None,
    notassignsTo: uuid.UUID | None = None,
    status: TaskStatus | None = None,
    due_after: datetime | None = None,
    due_before: datetime | None = None,
    get_count: bool = False,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=0),
):
    return await task_service.retrieve_tasks(
        me=me,
        session=session,
        id=id,
        search=search,
        categories=categories,
        assignsTo=assignsTo,
        notassignsTo=notassignsTo,
        status=status,
        due_after=due_after,
        due_before=due_before,
        get_count=get_count,
        offset=offset,
        limit=limit,
    )


@taskRouter.post("/", tags=["Task"])
async def create_task(
    me: Annotated[Account, Depends(account_service.require_admin)],
    body: TaskRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
):
    return await task_service.create_task(me, body, session)


@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(
    me: Annotated[Account, Depends(account_service.get_current_account)],
    task_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    body: TaskUpdate,
):
    return await task_service.update_task(me, task_id, session, body)


@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(
    task_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    return await task_service.delete_task(task_id, session, me)
