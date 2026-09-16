import os

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel

from app.dependencies import supabase

authRouter = APIRouter(prefix="/auth", tags=["Auth"])

JWT_COOKIE_KEY = "jwt"
COOKIE_SECURE = os.environ.get("ENVIRONMENT", "development") == "production"


class SignUpRequest(BaseModel):
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool = True


def _set_jwt_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=JWT_COOKIE_KEY,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


@authRouter.post("/signup", response_model=AuthResponse)
def signup(body: SignUpRequest, response: Response):
    auth_response = supabase.auth.sign_up({"email": body.email, "password": body.password})
    if auth_response.session is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Check your email to confirm your account")
    _set_jwt_cookie(response, auth_response.session.access_token)
    return AuthResponse()


@authRouter.post("/login", response_model=AuthResponse)
async def login(body: SignInRequest, response: Response):
    auth_response = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
    _set_jwt_cookie(response, auth_response.session.access_token)
    return AuthResponse()


@authRouter.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=JWT_COOKIE_KEY, path="/")
    return AuthResponse()


@authRouter.post("/refresh", response_model=AuthResponse)
async def refresh():
    pass
