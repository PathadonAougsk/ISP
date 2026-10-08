from typing import Annotated
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, case, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Ticket, Account, Category, AccountRole, TicketStatus, AuditLog
from app.service import account_service


class TicketCreate(BaseModel):
    name: str
    description: str | None = None
    category_id: int
    due_date: dt.datetime | None = None


class TicketUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: TicketStatus | None = None
    category_id: int | None = None
    due_date: dt.datetime | None = None


def to_utc(date):
    if date is None:
        return None

    return date.astimezone(dt.timezone.utc)


ticketRouter = APIRouter(prefix="/ticket", dependencies=[Depends(account_service.get_current_auth_user)])

@ticketRouter.get("/", tags=["Tickets"])
async def retrieve_tickets(session: Annotated[AsyncSession, Depends(getSession)],
                           me: Annotated[Account, Depends(account_service.get_current_account)],
                           ticket_id: int | None = None,
                           status: TicketStatus | None = None,
                           category_id: int | None = None,
                           due_before: dt.datetime | None = None,
                           onlyOwned: bool = False,
                           offset: int = Query(default=0, ge=0),
                           limit: int = Query(default=0, ge=0)
):
    query = select(Ticket)

    if ticket_id:
        query = query.where(Ticket.id == ticket_id)

    if status:
        query = query.where(Ticket.status == status)

    if category_id:
        query = query.where(Ticket.category_id == category_id)

    if due_before:
        query = query.where(Ticket.due_date <= to_utc(due_before))

    if me.role == AccountRole.LAB_USER or onlyOwned:
        query = query.where(Ticket.created_by == me.id)

    status_order = case(
        (Ticket.status == TicketStatus.PENDING, 1),
        (Ticket.status == TicketStatus.REJECTED, 2),
        (Ticket.status == TicketStatus.ACCEPTED, 3)
    )

    if me.role == AccountRole.LAB_ADMIN:
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

    return {"Tickets": result.all()}

@ticketRouter.post("/", tags=["Tickets"])
async def create_ticket(data: TicketCreate,
                        session: Annotated[AsyncSession, Depends(getSession)],
                        me: Annotated[Account, Depends(account_service.get_current_account)]
):
    if await session.get(Category, data.category_id) is None:
        raise HTTPException(status_code=404, detail="Category not found")

    if me.quota is not None and me.quota < 0:
        raise HTTPException(
            status_code=403,
            detail={
                    "message": "Ticket quota exhausted",
                    "code": "quota_exhausted",
                    "quota": 0
                }
            )
    else:
        new_quota = await session.scalar(
            update(Account)
            .where(
                Account.id == me.id,
                Account.quota > 0
            )
            .values(
                quota = Account.quota - 1
            )
            .returning(Account.quota))

    ticket = Ticket(
        name = data.name,
        description = data.description,
        status = TicketStatus.PENDING,
        category_id = data.category_id,
        created_by = me.id,
        completed_by = None,
        completed_at = None,
        due_date = to_utc(data.due_date)
    )

    session.add(ticket)
    await session.flush()

    ticket_audit = AuditLog(
        from_table = "ticket",
        row_id = str(ticket.id),
        column_name = "status",
        old_value = None,
        new_value = TicketStatus.PENDING.value,
        by_whom = me.id
    )

    session.add(ticket_audit)

    if me.quota is not None and new_quota:
        quota_audit = AuditLog(
            from_table = "account",
            row_id = str(me.id),
            column_name = "quota",
            old_value = str(new_quota + 1),
            new_value = str(new_quota),
            by_whom = me.id
        )

        session.add(quota_audit)

    await session.commit()

    return ticket

@ticketRouter.put("/{ticket_id}", tags=["Tickets"])
async def update_ticket(ticket_id: int,
                        data: TicketUpdate,
                        session: Annotated[AsyncSession, Depends(getSession)]
):
    ticket = await session.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if data.category_id is not None:
        category = await session.get(Category, data.category_id)

        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")

    if data.name is not None:
        ticket.name = data.name

    if data.description is not None:
        ticket.description = data.description

    if data.status is not None:
        ticket.status = data.status

    if data.category_id is not None:
        ticket.category_id = data.category_id

    if data.due_date is not None:
        ticket.due_date = to_utc(data.due_date)

    await session.commit()
    await session.refresh(ticket)

    return ticket

@ticketRouter.delete("/{ticket_id}", tags=["Tickets"])
async def delete_ticket(ticket_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    result = await session.scalars(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.first()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await session.delete(ticket)
    await session.commit()

    return {"message": "Ticket deleted successfully"}