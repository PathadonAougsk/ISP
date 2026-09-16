from typing import Annotated
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Ticket, Account, AccountRole, TicketStatus
from app.service import user_service

ticketRouter = APIRouter(prefix="/ticket", dependencies=[Depends(user_service.get_current_auth_user)])

@ticketRouter.get("/", tags=["Tickets"])
async def retrieve_tickets(session: Annotated[AsyncSession, Depends(getSession)],
                           me: Annotated[Account, Depends(user_service.get_current_auth_user)],
                           ticket_id: int | None = None,
                           status: TicketStatus | None = None,
                           category_id: int | None = None,
                           due_before: dt.datetime | None = None,
                           onlyOwned: bool = False,
                           limit: int | None = 20,
):
    query = select(Ticket)

    if ticket_id:
        query = query.where(Ticket.id == ticket_id)

    if status:
        query = query.where(Ticket.status == status)

    if category_id:
        query = query.where(Ticket.category_id == category_id)

    if due_before:
        query = query.where(Ticket.due_date <= due_before)

    if me.role == AccountRole.LAB_USER or onlyOwned:
        query = query.where(Ticket.created_by == me.id)

    status_order = case(
        (Ticket.status == TicketStatus.PENDING, 1),
        (Ticket.status == TicketStatus.REJECTED, 2),
        (Ticket.status == TicketStatus.ACCEPTED, 3)
    )

    if me.role == AccountRole.LAB_ADMIN:
        query = query.order_by(status_order)
    else:
        query = query.order_by(
            Ticket.due_date,
            status_order,
        )

    if limit:
        query = query.limit(limit)

    result = await session.scalars(query)

    return {"Tickets": result.all()}

@ticketRouter.post("/", tags=["Tickets"])
async def create_ticket():
    pass

@ticketRouter.put("/{ticket_id}", tags=["Tickets"])
async def update_ticket(ticket_id: int):
    pass

@ticketRouter.delete("/{ticket_id}", tags=["Tickets"])
async def delete_ticket(ticket_id: int, session: Annotated[AsyncSession, Depends(getSession)]):
    result = await session.scalars(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.first()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await session.delete(ticket)
    await session.commit()

    return {"message": "Ticket deleted successfully"}
