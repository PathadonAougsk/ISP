import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account, Task, TaskStatus
from app.service import user_service

# Base Task model.
class TaskRequest(BaseModel):
    name: str
    description: str | None = None
    status: TaskStatus = TaskStatus.IN_PROGRESS
    category_id: int
    due_date: datetime
    assignee_ids: list[uuid.UUID] | None = None

taskRouter = APIRouter(prefix="/task", dependencies=[Depends(user_service.get_current_auth_user)])

# Filter params here are optional. If given none, then get all.
# Filters: categories, users (assignees), status
@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(
    auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)],
    session: Annotated[AsyncSession, Depends(getSession)],
    categories: list[int] | None = Query(None),
    users: list[uuid.UUID] | None = Query(None),
    status: list[TaskStatus] | None = Query(None),
):
    tasks = select(Task)
    # Then, we filter each attribute one by one.
    if categories:
        tasks = tasks.where(Task.category_id.in_(categories))
    if users:
        tasks = tasks.where(Task.assignees.any(Account.id.in_(users)))
    if status:
        tasks = tasks.where(Task.status.in_(status))

    tasks = await session.scalars(tasks)
    return {"Tasks": tasks.all()}

@taskRouter.get("/{task_id}", tags=["Task"])
async def retrieve_task(auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)], task_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    # Request a query to get task from id
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    return {"Task": task}

@taskRouter.post("/", tags=["Task"])
async def create_task(auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)], body: TaskRequest, session: Annotated[AsyncSession, Depends(getSession)]):
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
async def update_task(auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)], task_id: int, session: Annotated[AsyncSession, Depends(getSession)], body: TaskRequest):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
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
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], auth_user: Annotated[AuthUser, Depends(user_service.get_current_auth_user)]):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}
