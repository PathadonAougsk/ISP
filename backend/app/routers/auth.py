from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.dependencies import supabase

authRouter = APIRouter(prefix="/auth", tags=["Auth"])

class SignUpRequest(BaseModel):
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@authRouter.post("/signup", response_model=TokenResponse)
async def signup(body: SignUpRequest):
    auth_response = supabase.auth.sign_up({"email": body.email, "password": body.password})
    if auth_response.session is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Check your email to confirm your account")
    return TokenResponse(access_token=auth_response.session.access_token)


@authRouter.post("/login", response_model=TokenResponse)
async def login(body: SignInRequest):
    auth_response = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
    return TokenResponse(access_token=auth_response.session.access_token)

@authRouter.post("/logout")
async def logout():
    pass

@authRouter.post("/refresh", response_model=TokenResponse)
async def refresh():
    pass
