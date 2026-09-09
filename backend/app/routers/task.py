from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Task
from app.service import user_service

from pydantic import BaseModel

# Base Task model.
class TaskRequest(BaseModel):
    name: str
    description: str | None = None
    status_id: int
    assigned_id: uuid.UUID | None = None

taskRouter = APIRouter(prefix="/task", dependencies=[Depends(user_service.get_current_auth_user)])

# Filter params here are optional. If given none, then get all. 
# Filters: categories, users, status, urgency
@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(session: Annotated[AsyncSession, Depends(getSession)], categories: list[str] | None = Query(None),
users: list[str] | None = Query(None), status: list[str] | None = Query(None),urgency: list[str] | None = Query(None)):
    tasks = select(Task)
    # Then, we filter each attribute one by one.
    if categories:
        tasks = tasks.where(Task.categories.in_(categories))
    if users:
        tasks = tasks.where(Task.created_by.in_(users))
    if status:
        tasks = tasks.where(Task.status_id.in_(status))
    if urgency:
        tasks = tasks.where(Task.urgency_id.in_(urgency))
    
    tasks = await session.scalars(tasks)
    return {"Tasks": tasks.all()}

@taskRouter.get("/{task_id}", tags=["Task"])
async def retrieve_task(task_id: int,session: Annotated[AsyncSession, Depends(getSession)]):
    # Request a query to get task from id
    tasks = await session.scalars(
        select(Task).filter(Task.id == task_id)
        )
    # If it does not exist, 404!
    if tasks is None:
        raise HTTPException(status_code=404, detail="Requested Task ID does not exist!")
    
    return {"Tasks": tasks}

@taskRouter.post("/", tags=["Task"])
async def create_task(body: TaskRequest ,session: Annotated[AsyncSession, Depends(getSession)],current_user=Depends(user_service.get_current_auth_user)):
    # Create new task based on the body.
    task = Task(
        name=body.name,
        description=body.description,
        status_id=body.status_id,
        assigned_id=body.assigned_id,
        created_by=current_user.id,
    )
    # Add it to session, and update.
    session.add(task)
    await session.commit()
    await session.refresh(task)

    return {"Tasks": task}

@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], body: TaskRequest):
    tasks = await session.scalar(
        select(Task).filter(Task.id == task_id)
    )
    # If it does not exist, 404!
    if tasks is None:
        raise HTTPException(status_code=404, detail="Requested Task ID does not exist!")
    
    task.name = body.name
    tasl.description = body.description
    task.status_id = body.status_id
    task.assigned_id = body.assigned_id

    await session.commit()
    await session.refresh(task)

    return {"Tasks": task}

@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    task = await session.scalar(
        select(Task).filter(Task.id == task_id)
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail="Requested Task ID does not exist!")
    
    session.delete(task)
    await session.commit()

    return {"Message": f"{task_id} has been successfully deleted!"} # This should return something that's NOT the task itself <!>
