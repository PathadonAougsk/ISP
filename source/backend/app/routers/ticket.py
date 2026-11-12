from typing import Annotated
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, case, update, func, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.datetime_utils import to_due_date, to_utc
from app.limits import DESCRIPTION_MAX, NAME_MAX
from app.model import Ticket, Account, Category, AccountRole, TicketStatus, AuditLog
from app.service import account_service


class TicketCreate(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)
    category_id: int
    due_date: dt.datetime | None = None


class TicketUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX)
    status: TicketStatus | None = None
    category_id: int | None = None
    due_date: dt.datetime | None = None


ticketRouter = APIRouter(
    prefix="/ticket", dependencies=[Depends(account_service.get_current_auth_user)])


@ticketRouter.get("/", tags=["Tickets"])
async def retrieve_tickets(
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
    ticket_id: int | None = None,
    search: str | None = None,
    status: TicketStatus | None = None,
    category_id: int | None = None,
    due_after: dt.datetime | None = None,
    due_before: dt.datetime | None = None,
    onlyOwned: bool = False,
    notOwned: bool = False,
    get_count: bool = False,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=0)
):
    query = select(Ticket)

    if ticket_id:
        query = query.where(Ticket.id == ticket_id)

    if search and search.strip():
        search = search.strip()

        conditions = [
            Ticket.name.ilike(f"%{search}%")
        ]

        if search.isdecimal():
            conditions.append(cast(Ticket.id, String).ilike(f"%{search}%"))

        query = query.where(or_(*conditions))

    if status:
        query = query.where(Ticket.status == status)

    if category_id:
        query = query.where(Ticket.category_id == category_id)

    if due_after:
        query = query.where(Ticket.due_date >= to_utc(due_after))

    if due_before:
        query = query.where(Ticket.due_date <= to_utc(due_before))

    if onlyOwned and notOwned:
        raise HTTPException(
            status_code=400,
            detail="onlyOwned and notOwned cannot both be true"
        )

    if me.role == AccountRole.LAB_USER:
        query = query.where(Ticket.created_by == me.id)
    elif onlyOwned:
        query = query.where(Ticket.created_by == me.id)
    elif notOwned:
        query = query.where(Ticket.created_by != me.id)

    ticket_count: int | None = None

    if get_count:
        ticket_count = await session.scalar(select(func.count()).select_from(query.subquery()))

    status_order = case(
        (Ticket.status == TicketStatus.PENDING, 1),
        (Ticket.status == TicketStatus.REJECTED, 2),
        (Ticket.status == TicketStatus.ACCEPTED, 3)
    )

    if me.role == AccountRole.LAB_ADMIN or me.role == AccountRole.LAB_OWNER:
        query = query.order_by(
            status_order,
            Ticket.due_date
        )
    else:
        query = query.order_by(
            Ticket.due_date,
            status_order
        )

    query = query.offset(offset)

    if limit:
        query = query.limit(limit)

    result = await session.scalars(query)

    if get_count:
        return {"Tickets": result.all(), "TicketCount": ticket_count}
    else:
        return {"Tickets": result.all()}


@ticketRouter.post("/", tags=["Tickets"])
async def create_ticket(
    data: TicketCreate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)]
):
    if await session.get(Category, data.category_id) is None:
        raise HTTPException(status_code=404, detail="Category not found")

    # A NULL quota means no cap. Otherwise the decrement is itself the gate:
    # it only matches while there is something left, so a spent quota matches
    # no row, returns nothing, and the ticket is refused.
    #
    # Gating on me.quota instead would not work. It can never be negative
    # (account_quota_check keeps it at 0 or above), so the old `< 0` test never
    # fired and a spent trial could keep filing tickets. It is also a value
    # read before this request started, so two tickets sent at once off a
    # quota of 1 would both pass it.
    new_quota: int | None = None

    if me.quota is not None:
        new_quota = await session.scalar(
            update(Account)
            .where(
                Account.id == me.id,
                Account.quota > 0
            )
            .values(
                quota=Account.quota - 1
            )
            .returning(Account.quota))

        if new_quota is None:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Ticket quota exhausted",
                    "code": "quota_exhausted",
                    "quota": 0
                }
            )

    ticket = Ticket(
        name=data.name,
        description=data.description,
        status=TicketStatus.PENDING,
        category_id=data.category_id,
        created_by=me.id,
        completed_by=None,
        completed_at=None,
        due_date=to_due_date(data.due_date)
    )

    session.add(ticket)
    await session.flush()

    audit_fields = {
        "name": data.name,
        "description": data.description,
        "status": TicketStatus.PENDING.value,
        "category_id": data.category_id,
        "due_date": to_due_date(data.due_date)
    }

    for col_name, new_value in audit_fields.items():
        session.add(AuditLog(
            from_table="ticket",
            row_id=str(ticket.id),
            column_name=col_name,
            old_value=None,
            new_value=str(new_value) if new_value is not None else None,
            by_whom=me.id
        ))

    if new_quota is not None:
        quota_audit = AuditLog(
            from_table="account",
            row_id=str(me.id),
            column_name="quota",
            old_value=str(new_quota + 1),
            new_value=str(new_quota),
            by_whom=me.id
        )

        session.add(quota_audit)

    await session.commit()

    return ticket


@ticketRouter.put("/{ticket_id}", tags=["Tickets"])
async def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)]
):
    ticket = await session.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if data.category_id is not None:
        category = await session.get(Category, data.category_id)

        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")

    def update_ticket_log(col_name, old_val, new_val):
        audit = AuditLog(
            from_table="ticket",
            row_id=str(ticket.id),
            column_name=col_name,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
            by_whom=me.id
        )

        if audit.old_value == audit.new_value:
            return None

        return audit

    audit_list = []

    if data.name is not None:
        audit_list.append(
            update_ticket_log("name", ticket.name, data.name)
        )
        ticket.name = data.name

    if data.description is not None:
        audit_list.append(
            update_ticket_log("description", ticket.description, data.description)
        )
        ticket.description = data.description

    if data.status is not None:
        audit_list.append(
            update_ticket_log("status", ticket.status, data.status)
        )
        ticket.status = data.status

    if data.category_id is not None:
        audit_list.append(
            update_ticket_log("category_id", ticket.category_id, data.category_id)
        )
        ticket.category_id = data.category_id

    if data.due_date is not None:
        new_due_date = to_due_date(data.due_date)

        audit_list.append(
            update_ticket_log("due_date", to_utc(ticket.due_date), new_due_date)
        )
        ticket.due_date = new_due_date

    for audit in audit_list:
        if audit is not None:
            session.add(audit)

    await session.commit()
    await session.refresh(ticket)

    return ticket


@ticketRouter.delete("/{ticket_id}", tags=["Tickets"])
async def delete_ticket(
    ticket_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)]
):
    ticket = await session.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    audit_fields = {
        "name": ticket.name,
        "description": ticket.description,
        "status": ticket.status,
        "category_id": ticket.category_id,
        "due_date": ticket.due_date
    }

    for col_name, old_value in audit_fields.items():
        session.add(AuditLog(
            from_table="ticket",
            row_id=str(ticket.id),
            column_name=col_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=None,
            by_whom=me.id
        ))

    await session.delete(ticket)
    await session.commit()

    return {"message": "Ticket deleted successfully"}
