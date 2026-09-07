from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Task
from app.service import user_service

taskRouter = APIRouter(prefix="/task", dependencies=[Depends(user_service.get_current_auth_user)])

@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(session: Annotated[AsyncSession, Depends(getSession)]):
    tasks = await session.scalars(select(Task))
    return {"Tasks": tasks.all()}

@taskRouter.get("/{task_id}", tags=["Task"])
async def retrieve_task(task_id: int):
    pass

@taskRouter.post("/", tags=["Task"])
async def create_task():
    pass

@taskRouter.put("/{task_id}", tags=["Task"])
async def update_task(task_id: int):
    pass

@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int):
    pass
