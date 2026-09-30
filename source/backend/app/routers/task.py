import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account, AccountRole, Task, TaskStatus
from app.service import account_service


# Base Task model.
class TaskRequest(BaseModel):
    name: str
    description: str | None = None
    status: TaskStatus = TaskStatus.IN_PROGRESS
    category_id: int
    due_date: datetime
    assignee_ids: list[uuid.UUID] | None = None


taskRouter = APIRouter(prefix="/task", dependencies=[Depends(account_service.get_current_auth_user)])

# Filter params here are optional. If given none, then get all.
# Filters: id, categories, users (assignees), status, limit
# Admins and the lab owner see every task, a plain lab user only sees their own.

@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(
    me: Annotated[Account, Depends(account_service.get_current_account)],
    session: Annotated[AsyncSession, Depends(getSession)],
    id: int | None = Query(None),
    categories: int | None = Query(None),
    assignsTo: uuid.UUID | None = Query(None),
    status: TaskStatus | None = Query(None),
    limit: int | None = Query(None, ge=20),
):
    tasks = select(Task).options(selectinload(Task.assignees))
    # Then, we filter each attribute one by one.
    if id:
        tasks = tasks.where(Task.id == id)
    if categories:
        tasks = tasks.where(Task.category_id == categories)
    if assignsTo:
        tasks = tasks.where(Task.assignees.any(Account.id == assignsTo))
    if status:
        tasks = tasks.where(Task.status == status)
    # A lab user never sees tasks that are not assigned to them.
    if me.role == AccountRole.LAB_USER:
        tasks = tasks.where(Task.assignees.any(Account.id == me.id))

    # Most urgent due date first, and unfinished work first when they tie.
    status_order = case(
        (Task.status == TaskStatus.IN_PROGRESS, 1),
        (Task.status == TaskStatus.COMPLETED, 2),
    )
    tasks = tasks.order_by(Task.due_date, status_order)

    # Cap how many tasks come back, if asked for.
    if limit:
        tasks = tasks.limit(limit)

    tasks = (await session.scalars(tasks)).all()
    # Asking for a specific task that does not exist is a 404.
    if id and not tasks:
        raise HTTPException(status_code=404, detail=f"Task with id {id} not found")

    return {"Tasks": tasks}


@taskRouter.post("/", tags=["Task"])
async def create_task(auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)], body: TaskRequest, session: Annotated[AsyncSession, Depends(getSession)]):
    # Create new task based on the body.
    task = Task(
        name=body.name,
        description=body.description,
        status=body.status,
        category_id=body.category_id,
        due_date=body.due_date,
        created_by=auth_user.id,
    )
    if body.assignee_ids:
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignee_ids)))
        task.assignees = list(assignees.all())

    # Add it to session, and update.
    session.add(task)
    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(
    auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)],
    task_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    body: TaskRequest
):
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.assignees))
        .where(Task.id == task_id)
    )

    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    task.name = body.name
    task.description = body.description
    task.status = body.status
    task.category_id = body.category_id
    task.due_date = body.due_date
    if body.assignee_ids is not None:
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignee_ids)))
        task.assignees = list(assignees.all())

    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)]):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}
