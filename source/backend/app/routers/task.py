import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.datetime_utils import to_due_date, to_utc
from app.limits import DESCRIPTION_MAX, NAME_MAX
from app.model import Account, AccountRole, Task, TaskStatus, AuditLog
from app.service import account_service


# Base Task model.
class TaskRequest(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)
    status: TaskStatus = TaskStatus.IN_PROGRESS
    category_id: int
    due_date: datetime | None = None
    assignees: list[uuid.UUID] | None = None


class TaskUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)
    status: TaskStatus | None = None
    category_id: int | None = None
    due_date: datetime | None = None
    assignees: list[uuid.UUID] | None = None


taskRouter = APIRouter(prefix="/task", dependencies=[Depends(account_service.get_current_auth_user)])


# Assignees are logged by username, the way the log shows every other actor -
# a list of uuids tells a reader nothing, and the old value (Account rows) and
# the new one (uuids from the body) have to end up in the same shape or an
# unchanged assignee list reads as a change on every save.
def assignee_label(accounts: list[Account]) -> str | None:
    return ", ".join(sorted(account.username for account in accounts)) or None


def task_audit(task_id: int, column_name: str, old_value, new_value, by_whom) -> AuditLog:
    return AuditLog(
        from_table="task",
        row_id=str(task_id),
        column_name=column_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        by_whom=by_whom,
    )


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
    limit: int = Query(default=100, ge=0)
):
    from sqlalchemy import cast, String, or_, func

    tasks = select(Task).options(selectinload(Task.assignees))

    if id:
        tasks = tasks.where(Task.id == id)

    if search and search.strip():
        search = search.strip()

        conditions = [Task.name.ilike(f"%{search}%")]

        if search.isdecimal():
            conditions.append(cast(Task.id, String).ilike(f"%{search}%"))

        tasks = tasks.where(or_(*conditions))

    if categories:
        tasks = tasks.where(Task.category_id == categories)

    if assignsTo:
        tasks = tasks.where(Task.assignees.any(Account.id == assignsTo))

    if notassignsTo:
        tasks = tasks.where(~Task.assignees.any(Account.id == notassignsTo))

    if status:
        tasks = tasks.where(Task.status == status)

    if due_after:
        tasks = tasks.where(Task.due_date >= to_utc(due_after))

    if due_before:
        tasks = tasks.where(Task.due_date <= to_utc(due_before))

    if me.role == AccountRole.LAB_USER:
        tasks = tasks.where(Task.assignees.any(Account.id == me.id))

    task_count: int | None = None

    if get_count:
        task_count = await session.scalar(
            select(func.count()).select_from(tasks.subquery())
        )

    status_order = case(
        (Task.status == TaskStatus.IN_PROGRESS, 1),
        (Task.status == TaskStatus.COMPLETED, 2),
    )

    tasks = tasks.order_by(status_order, Task.due_date)  # status first then due_date
    tasks = tasks.offset(offset)

    if limit:
        tasks = tasks.limit(limit)

    result = await session.scalars(tasks)
    task_list = result.all()

    if id and not task_list:
        raise HTTPException(
            status_code=404,
            detail=f"Task with id {id} not found",
        )

    if get_count:
        return {"Tasks": task_list, "TaskCount": task_count}

    return {"Tasks": task_list}


@taskRouter.post("/", tags=["Task"])
async def create_task(auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)], body: TaskRequest, session: Annotated[AsyncSession, Depends(getSession)]):
    # Create new task based on the body.
    conv_duedate = to_due_date(body.due_date)

    task = Task(
        name=body.name,
        description=body.description,
        status=body.status,
        category_id=body.category_id,
        due_date=conv_duedate,
        created_by=auth_user.id,
    )

    if body.assignees:
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignees)))
        task.assignees = list(assignees.all())

    # Postgres assigns the id, so the task has to reach the database before the
    # audit rows can point at it.
    session.add(task)
    await session.flush()

    # Create an audit log for the creation! One row per column the create
    # filled in, so a create reads the same way as an update does. A column
    # left empty is skipped - "nothing to nothing" is not a change to record.
    audit_fields = {
        "name": task.name,
        "description": task.description,
        "status": task.status.value,
        "category_id": task.category_id,
        "due_date": task.due_date,
        "assignees": assignee_label(task.assignees),
    }

    for col_name, new_value in audit_fields.items():
        if new_value is not None:
            session.add(task_audit(task.id, col_name, None, new_value, auth_user.id))

    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(
    auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)],
    task_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    body: TaskUpdate
):
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.assignees))
        .where(Task.id == task_id)
    )

    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    # Create an audit log for the update! None when the column did not actually
    # change - an untouched column should not leave a row that reads as a change.
    def update_helper(col_name, old_val, new_value):
        al = task_audit(task.id, col_name, old_val, new_value, auth_user.id)

        if al.old_value == al.new_value:
            return None

        return al

    audit_list = []

    # If it exists, then you definetly should update it!
    if body.name is not None:
        audit_list.append(update_helper("name", task.name, body.name))
        task.name = body.name

    if body.description is not None:
        audit_list.append(update_helper("description", task.description, body.description))
        task.description = body.description

    if body.status is not None:
        audit_list.append(update_helper("status", task.status.value, body.status.value))
        task.status = body.status

    if body.category_id is not None:
        audit_list.append(update_helper("category_id", task.category_id, body.category_id))
        task.category_id = body.category_id

    if body.due_date is not None:
        dt1 = to_utc(task.due_date)
        dt2 = to_due_date(body.due_date)
        audit_list.append(update_helper("due_date", dt1, dt2))
        task.due_date = dt2

    if body.assignees is not None:
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignees)))
        new_assignees = list(assignees.all())

        # Compared as the resolved accounts, not as the ids that came in: an id
        # with no account behind it is dropped, and that is not a change.
        audit_list.append(update_helper(
            "assignees", assignee_label(task.assignees), assignee_label(new_assignees)
        ))
        task.assignees = new_assignees

    for audit in audit_list:
        if audit is not None:
            session.add(audit)

    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)]):
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.assignees))
        .where(Task.id == task_id)
    )

    # If it does not exist, 404! Before anything reads off the task.
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    # Create an audit log for the deletes! The row is about to go, so the log is
    # the only place its last values survive.
    audit_fields = {
        "name": task.name,
        "description": task.description,
        "status": task.status.value,
        "category_id": task.category_id,
        "due_date": task.due_date,
        "assignees": assignee_label(task.assignees),
    }

    for col_name, old_value in audit_fields.items():
        if old_value is not None:
            session.add(task_audit(task.id, col_name, old_value, None, auth_user.id))

    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}
