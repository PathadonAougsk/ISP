from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase_auth.errors import AuthApiError

from app.dependencies import supabase
from app.routers.announcement import announcementRouter
from app.routers.audit_log import auditLogRouter
from app.routers.auth import authRouter
from app.routers.category import categoryRouter
from app.routers.task import taskRouter
from app.routers.ticket import ticketRouter
from app.routers.user import userRouter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AuthApiError)
def handle_auth_error(request: Request, exc: AuthApiError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.message})

@app.get("/health", tags=["Systems"])
def check_health():
    return {"Ok"}

@app.get("/db", tags=["Systems"])
def check_db():
    if bool(supabase.table("ticket").select("*").execute()):
        return {"Ok"}
    else:
        return {"Not Ok"}

app.include_router(ticketRouter)
app.include_router(userRouter)
app.include_router(authRouter)
app.include_router(categoryRouter)
app.include_router(announcementRouter)
app.include_router(taskRouter)
app.include_router(auditLogRouter)
