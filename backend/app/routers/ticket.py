from fastapi import APIRouter

from app.dependencies import supabase

ticketRouter = APIRouter(prefix="/ticket")

@ticketRouter.get("/", tags=["Tickets"])
async def retrieve_tickets():
    return supabase.table("ticket").select("*").execute()
