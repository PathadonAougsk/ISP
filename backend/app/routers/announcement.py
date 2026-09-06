# TO BE CONSIDERS

from fastapi import APIRouter

from app.dependencies import supabase

announcementRouter = APIRouter(prefix="/announcement")

@announcementRouter.get("/", tags=["Announcement"])
async def retrieve_annoucement():
    pass
