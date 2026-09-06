from fastapi import FastAPI

from app.dependencies import supabase
from app.routers.announcement import announcementRouter
from app.routers.category import categoryRouter
from app.routers.priority import priorityRouter
from app.routers.status import statusRouter
from app.routers.ticket import ticketRouter
from app.routers.user import userRouter

app = FastAPI()

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
app.include_router(priorityRouter)
app.include_router(statusRouter)
app.include_router(categoryRouter)
app.include_router(announcementRouter)
