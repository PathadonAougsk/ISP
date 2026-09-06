from fastapi import APIRouter

from app.dependencies import supabase

userRouter = APIRouter(prefix="/user")

@userRouter.get("/", tags=["User"])
async def retrieve_users():
    pass
