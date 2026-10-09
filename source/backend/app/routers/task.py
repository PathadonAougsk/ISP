import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account, AccountRole, Task, TaskStatus, AuditLog
from app.service import account_service


# Base Task model.
class TaskRequest(BaseModel):
    name: str
    description: str | None = None
    status: TaskStatus = TaskStatus.IN_PROGRESS
    category_id: int
    due_date: datetime | None = None
    assignees: list[uuid.UUID] | None = None


taskRouter = APIRouter(prefix="/task", dependencies=[Depends(account_service.get_current_auth_user)])

# Filter params here are optional. If given none, then get all.
# Filters: id, categories, users (assignees), status, limit
# Admins and the lab owner see every task, a plain lab user only sees their own.

@taskRouter.get("/", tags=["Task"])
async def retrieve_tasks(
    me: Annotated[Account, Depends(account_service.get_current_account)],
    session: Annotated[AsyncSession, Depends(getSession)],
    id: int | None = None,
    categories: int | None = None,
    assignsTo: uuid.UUID | None = None,
    status: TaskStatus | None = None,
    limit: int = 20,
    offset: int= 0 # Where will the results start? 0 means at the beginning.
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
    tasks = tasks.limit(limit)
    if (offset > 0):
        tasks = tasks.offset(offset)

    tasks = (await session.scalars(tasks)).all()
    # Asking for a specific task that does not exist is a 404.
    if id and not tasks:
        raise HTTPException(status_code=404, detail=f"Task with id {id} not found")

    return {"Tasks": tasks}


@taskRouter.post("/", tags=["Task"])
async def create_task(auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)], body: TaskRequest, session: Annotated[AsyncSession, Depends(getSession)]):
    # Create new task based on the body.
    conv_duedate = None
    if body.due_date != None:
        conv_duedate = body.due_date.astimezone(timezone.utc)

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
        from_table = "task",
        row_id = str(task.id),
        column_name = "status",
        old_value = None,
        new_value = TaskStatus.IN_PROGRESS.value,
        by_whom = auth_user.id
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

    # Create an audit log for the update! 
    def update_helper(col_name,old_val, new_value):

        al = AuditLog(
            from_table = "task",
            row_id = str(task.id),
            column_name = col_name,
            old_value = f"{old_val}",
            new_value = f"{new_value}",
            by_whom = auth_user.id
        )
        if (al.old_value == al.new_value): return 0
        else: return al
    
    audit_list = []


    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    # If it exists, then you definetly should update it!
    if body.name is not None:
        audit_list.append(update_helper("name",task.name, body.name))
        task.name = body.name
    
    if body.description is not None:
        audit_list.append(update_helper("description",task.description, body.description))
        task.description = body.description

    if body.status is not None:
        audit_list.append(update_helper("status",task.status, body.status))
        task.status = body.status

    if body.category_id is not None:
        audit_list.append(update_helper("category_id",task.category_id, body.category_id))
        task.category_id = body.category_id

    if body.due_date is not None:
        # TIME ZONE PROBLEM!!!! THIS IS A TEMPORARY FIX!!!
        dt1 = None
        if (task.due_date != None):
            dt1 = task.due_date.astimezone(timezone.utc)
        dt2 = body.due_date.astimezone(timezone.utc)
        audit_list.append(update_helper("due_date",dt1, dt2))
        task.due_date = dt2

    if body.assignees is not None:
        audit_list.append(update_helper("assignees",task.assignees, body.assignees))
        assignees = await session.scalars(select(Account).where(Account.id.in_(body.assignees)))
        task.assignees = list(assignees.all())

    for i in audit_list:
        if i != 0:
            session.add(i)
    await session.commit()
    await session.refresh(task)

    return {"Task": task}


@taskRouter.delete("/{task_id}", tags=["Task"])
async def delete_task(task_id: int, session: Annotated[AsyncSession, Depends(getSession)], auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)]):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )
    
    # Create an audit log for the deletes!
    al = AuditLog(
        from_table = "task",
        row_id = str(task.id),
        column_name = "status",
        old_value = None,
        new_value = None,
        by_whom = auth_user.id
    )
    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    session.add(al)
    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}