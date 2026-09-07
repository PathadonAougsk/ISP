from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.model import Ticket
from app.service import user_service

ticketRouter = APIRouter(prefix="/ticket", dependencies=[Depends(user_service.get_current_auth_user)])

@ticketRouter.get("/", tags=["Tickets"])
async def retrieve_tickets(session: Annotated[AsyncSession, Depends(getSession)]):
    tickets = await session.scalars(select(Ticket))
    return {"Tickets": tickets.all()}

@ticketRouter.get("/{ticket_id}", tags=["Tickets"])
async def retrieve_ticket(ticket_id: int):
    pass

@ticketRouter.post("/", tags=["Tickets"])
async def create_ticket():
    pass

@ticketRouter.put("/{ticket_id}", tags=["Tickets"])
async def update_ticket(ticket_id: int):
    pass

@ticketRouter.delete("/{ticket_id}", tags=["Tickets"])
async def delete_ticket(ticket_id: int):
    pass
