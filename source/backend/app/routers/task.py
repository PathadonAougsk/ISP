import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import AuthUser, get_current_auth_user
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
async def create_task(auth_user: Annotated[AuthUser, Depends(get_current_auth_user)], body: TaskRequest, session: Annotated[AsyncSession, Depends(getSession)]):
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

    # Create an audit log for the creation!
    al = AuditLog(
        from_table="task",
        row_id=str(task.id),
        column_name="status",
        old_value=None,
        new_value=TaskStatus.IN_PROGRESS.value,
        by_whom=auth_user.id
    )

    if body.assignees:
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignees)))
        task.assignees = list(assignees.all())

    # Add it to session, and update.
    session.add(al)
    session.add(task)
    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(
    auth_user: Annotated[AuthUser, Depends(get_current_auth_user)],
    task_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    body: TaskUpdate
):
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.assignees))
        .where(Task.id == task_id)
    )

    # Create an audit log for the update!
    def update_helper(col_name, old_val, new_value):

        al = AuditLog(
            from_table="task",
            row_id=str(task.id),
            column_name=col_name,
            old_value=f"{old_val}",
            new_value=f"{new_value}",
            by_whom=auth_user.id
        )
        if (al.old_value == al.new_value):
            return 0
        else:
            return al

    audit_list = []

    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    # If it exists, then you definetly should update it!
    if body.name is not None:
        audit_list.append(update_helper("name", task.name, body.name))
        task.name = body.name

    if body.description is not None:
        audit_list.append(update_helper("description", task.description, body.description))
        task.description = body.description

    if body.status is not None:
        audit_list.append(update_helper("status", task.status, body.status))
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
        audit_list.append(update_helper("assignees", task.assignees, body.assignees))
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignees)))
        task.assignees = list(assignees.all())

    for i in audit_list:
        if i != 0:
            session.add(i)
    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], auth_user: Annotated[AuthUser, Depends(get_current_auth_user)]):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )

    # Create an audit log for the deletes!
    al = AuditLog(
        from_table="task",
        row_id=str(task.id),
        column_name="status",
        old_value=None,
        new_value=None,
        by_whom=auth_user.id
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    session.add(al)
    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}
