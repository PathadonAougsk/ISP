from fastapi import APIRouter

from app.dependencies import supabase

priorityRouter = APIRouter(prefix="/priority")

@priorityRouter.get("/", tags=["Priority"])
async def retrieve_priority():
    pass
