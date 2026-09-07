from fastapi import APIRouter
from pydantic.main import BaseModel
from sqlalchemy.orm import Session

from app.database import engine
from app.dependencies import supabase
from app.model import Account
userRouter = APIRouter(prefix="/user")

class info(BaseModel):
    email: str

@userRouter.get("/", tags=["User"])
async def retrieve_users():
    pass

@userRouter.post("/Create", tags=["User"])
async def create_user(info : info):
    data = supabase.auth.sign_up({
        "email" : info.email,
        "password" : "12345678"
    })

    return data.user.id
