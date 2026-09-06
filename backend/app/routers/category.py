from fastapi import APIRouter

from app.dependencies import supabase

categoryRouter = APIRouter(prefix="/category")

@categoryRouter.get("/", tags=["Category"])
async def retrieve_categories():
    pass
