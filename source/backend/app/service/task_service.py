import uuid
from datetime import datetime

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import String, case, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.datetime_utils import to_due_date, to_utc
from app.limits import DESCRIPTION_MAX, NAME_MAX
from app.model import Account, AccountRole, AuditLog, Task, TaskStatus
from app.service.account_service import is_admin


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


async def retrieve_tasks(
    me: Account,
    session: AsyncSession,
    id: int | None = None,
    search: str | None = None,
    categories: int | None = None,
    assignsTo: uuid.UUID | None = None,
    notassignsTo: uuid.UUID | None = None,
    status: TaskStatus | None = None,
    due_after: datetime | None = None,
    due_before: datetime | None = None,
    get_count: bool = False,
    offset: int = 0,
    limit: int = 100,
):
    # Filter params here are optional. If given none, then get all.
    # Filters: id, categories, users (assignees), status, limit
    # Admins and the lab owner see every task, a plain lab user only sees their own.
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


async def create_task(
    me: Account,
    body: TaskRequest,
    session: AsyncSession,
):
    # Create new task based on the body.
    conv_duedate = to_due_date(body.due_date)

    task = Task(
        name=body.name,
        description=body.description,
        status=body.status,
        category_id=body.category_id,
        due_date=conv_duedate,
        created_by=me.id,
    )

    if body.assignees:
        assignees = await session.scalars(
            select(Account).where(
                Account.id.in_(body.assignees),
                Account.active.is_(True),
            )
        )
        task.assignees = list(assignees.all())
        if len(task.assignees) != len(set(body.assignees)):
            raise HTTPException(status_code=400, detail="One or more assignees are invalid")

    session.add(task)
    await session.flush()

    al = AuditLog(
        from_table="task",
        row_id=str(task.id),
        column_name="status",
        old_value=None,
        new_value=body.status.value,
        by_whom=me.id,
    )
    session.add(al)

    await session.commit()
    await session.refresh(task)

    return {"Task": task}


async def update_task(
    me: Account,
    task_id: int,
    session: AsyncSession,
    body: TaskUpdate,
):
    task = await session.scalar(
        select(Task)
        .options(selectinload(Task.assignees))
        .where(Task.id == task_id)
    )

    # Create an audit log for the update!
    def create_audit_log(col_name, old_val, new_value):
        al = AuditLog(
            from_table="task",
            row_id=str(task.id),
            column_name=col_name,
            old_value=None if old_val is None else str(old_val),
            new_value=None if new_value is None else str(new_value),
            by_whom=me.id,
        )
        if al.old_value == al.new_value:
            return None
        else:
            return al

    audit_list = []

    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    if not is_admin(me):
        if not any(assignee.id == me.id for assignee in task.assignees):
            raise HTTPException(status_code=403, detail="You are not assigned to this task")
        if body.model_dump(exclude_unset=True).keys() - {"status"}:
            raise HTTPException(
                status_code=403,
                detail="Only task status can be changed by an assigned user",
            )

    # If it exists, then you definitely should update it!
    if body.name is not None:
        audit_list.append(create_audit_log("name", task.name, body.name))
        task.name = body.name

    if "description" in body.model_fields_set:
        audit_list.append(
            create_audit_log("description", task.description, body.description)
        )
        task.description = body.description

    if body.status is not None:
        audit_list.append(create_audit_log("status", task.status, body.status))
        task.status = body.status

    if body.category_id is not None:
        audit_list.append(
            create_audit_log("category_id", task.category_id, body.category_id)
        )
        task.category_id = body.category_id

    if "due_date" in body.model_fields_set:
        dt1 = to_utc(task.due_date)
        dt2 = to_due_date(body.due_date)
        audit_list.append(create_audit_log("due_date", dt1, dt2))
        task.due_date = dt2

    if body.assignees is not None:
        current_assignee_ids = {assignee.id for assignee in task.assignees}
        requested_assignee_ids = set(body.assignees)

        if current_assignee_ids != requested_assignee_ids:
            assignees = await session.scalars(
                select(Account).where(
                    Account.id.in_(requested_assignee_ids),
                    Account.active.is_(True),
                )
            )
            new_assignees = list(assignees.all())
            if len(new_assignees) != len(requested_assignee_ids):
                raise HTTPException(status_code=400, detail="One or more assignees are invalid")

            old_assignee_value = ",".join(
                sorted(str(assignee_id) for assignee_id in current_assignee_ids)
            )
            new_assignee_value = ",".join(
                sorted(str(assignee_id) for assignee_id in requested_assignee_ids)
            )
            audit_list.append(
                create_audit_log("assignees", old_assignee_value, new_assignee_value)
            )
            task.assignees = new_assignees

    for audit in audit_list:
        if audit is not None:
            session.add(audit)
    await session.commit()
    await session.refresh(task)

    return {"Task": task}


async def delete_task(
    task_id: int,
    session: AsyncSession,
    me: Account,
):
    task = await session.scalar(
        select(Task).where(Task.id == task_id)
    )

    # If it does not exist, 404!
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")

    if not is_admin(me):
        raise HTTPException(
            status_code=403,
            detail="Only a Lab Owner or Lab Admin can delete tasks",
        )

    # Create an audit log for the deletes!
    audit_fields = {
        "name": task.name,
        "description": task.description,
        "status": task.status,
        "category_id": task.category_id,
        "due_date": task.due_date,
    }

    for column_name, old_value in audit_fields.items():
        session.add(
            AuditLog(
                from_table="task",
                row_id=str(task.id),
                column_name=column_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=None,
                by_whom=me.id,
            )
        )

    await session.delete(task)
    await session.commit()

    return {"Message": f"Task {task_id} has been successfully deleted"}
