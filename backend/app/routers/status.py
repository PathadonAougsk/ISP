from fastapi import APIRouter

from app.dependencies import supabase

statusRouter = APIRouter(prefix="/status")

@statusRouter.get("/", tags=["Status"])
async def retrieve_status():
    pass
