import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import getSession
from app.limits import DESCRIPTION_MAX, Name
from app.model import Account, TicketStatus
from app.service import account_service, ticket_service


class TicketCreate(BaseModel):
    name: Name
    description: str | None = Field(
        default=None,
        max_length=DESCRIPTION_MAX,
    )
    category_id: int
    due_date: dt.datetime | None = None


class TicketUpdate(BaseModel):
    name: Name | None = None
    description: str | None = Field(
        default=None,
        max_length=DESCRIPTION_MAX,
    )
    status: TicketStatus | None = None
    category_id: int | None = None
    due_date: dt.datetime | None = None
    # only read on accept: who the new task goes to
    assignees: list[uuid.UUID] | None = None


ticketRouter = APIRouter(
    prefix="/ticket",
    dependencies=[
        Depends(account_service.get_current_auth_user)
    ],
)


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
    limit: int = Query(default=100, ge=0),
):
    return await ticket_service.retrieve_tickets(
        session=session,
        me=me,
        ticket_id=ticket_id,
        search=search,
        status=status,
        category_id=category_id,
        due_after=due_after,
        due_before=due_before,
        onlyOwned=onlyOwned,
        notOwned=notOwned,
        get_count=get_count,
        offset=offset,
        limit=limit,
    )


@ticketRouter.post("/", tags=["Tickets"])
async def create_ticket(
    data: TicketCreate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    return await ticket_service.create_ticket(
        session=session,
        me=me,
        data=data,
    )


@ticketRouter.put("/{ticket_id}", tags=["Tickets"])
async def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    return await ticket_service.update_ticket(
        session=session,
        me=me,
        ticket_id=ticket_id,
        data=data,
    )


@ticketRouter.delete("/{ticket_id}", tags=["Tickets"])
async def delete_ticket(
    ticket_id: int,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    return await ticket_service.delete_ticket(
        session=session,
        me=me,
        ticket_id=ticket_id,
    )
