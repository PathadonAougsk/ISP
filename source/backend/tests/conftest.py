"""Environment for every test.

The app modules read their Supabase settings at import time and raise when
they are missing, so this has to run before any `app.*` import. The real
source/.env wins when it exists; the placeholders only fill gaps so the
collection still works on a machine without one (the database tests then
skip themselves).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault(
    "SUPABASE_KEY", "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl"
)
os.environ.setdefault(
    "SUPABASE_DB_URL", "postgresql+asyncpg://user:pass@localhost:5432/test"
)
