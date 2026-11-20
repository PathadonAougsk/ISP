import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.dependencies import supabase
from app.routers.account import accountRouter
from app.routers.announcement import announcementRouter
from app.routers.audit_log import auditLogRouter
from app.routers.category import categoryRouter
from app.routers.task import taskRouter
from app.routers.ticket import ticketRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(accountRouter)
app.include_router(categoryRouter)
app.include_router(announcementRouter)
app.include_router(taskRouter)
app.include_router(auditLogRouter)
