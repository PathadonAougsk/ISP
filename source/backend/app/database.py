import asyncio
import os
import uuid
from collections.abc import AsyncIterator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.model import Base

load_dotenv()

cn: str | None = os.environ.get("SUPABASE_DB_URL")
if not cn:
    raise ValueError("Connection string is missing from .env")

engine = create_async_engine(
    cn,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
    },
)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

async def getSession() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session

async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def setup() -> None:
    await create_tables()

if __name__ == "__main__":
    asyncio.run(setup())
