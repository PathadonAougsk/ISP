import asyncio
import os
from collections.abc import AsyncIterator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.model import Base

load_dotenv()

cn: str | None = os.environ.get("SUPABASE_DB_URL")
if not cn:
    raise ValueError("Connection string is missing from .env")

engine = create_async_engine(cn)
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
