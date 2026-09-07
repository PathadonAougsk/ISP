import os

from sqlalchemy import create_engine

from app.model import (
    Base,
    app_tables,
)

cn: str | None = os.environ.get("SUPABASE_DB_URL")
if not cn:
    raise ValueError("Connection string is missing from .env")

engine = create_engine(cn, echo=True)
Base.metadata.create_all(engine, tables=app_tables())
