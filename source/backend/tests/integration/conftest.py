"""Fixtures for the tests that hit the real Supabase database.

Rules these tests follow so they are safe against shared data:
- The caller is an existing active admin account (override with
  TEST_ACCOUNT_ID). Only the bearer token check is faked; get_current_account
  and every permission check run for real.
- Every row a test writes is tracked, and the teardown deletes it together
  with its audit rows. Tickets and tasks live under a category created for
  that test. Accounts created through the API have their Supabase login
  removed as well.
- The one existing Lab User the tests sign in as is only ever used to read,
  or to be assigned to a task that is deleted again.
- They skip when SUPABASE_DB_URL is missing or SKIP_DB_TESTS is set.

All database work in a test goes through `db.run(coro_fn)`, which executes on
the TestClient's own event loop, so one pooled engine serves both the app and
the assertions without crossing loops.
"""

import asyncio
import os
import uuid
from collections import defaultdict
from contextlib import suppress
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.database import getSession
from app.dependencies import supabase
from app.main import app
from app.model import (
    Account,
    AccountRole,
    Announcement,
    AuditLog,
    Category,
    Task,
    TaskStatus,
    Ticket,
    TicketStatus,
)
from app.service import account_service

AUTH_HEADER = {"Authorization": "Bearer integration-test"}

CONNECT_ARGS = {
    # Same as app.database: the Supabase transaction pooler cannot keep
    # prepared statements between requests.
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
    "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
}


def unique(prefix: str = "pytest") -> str:
    return f"{prefix} {uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="session")
def db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if not url or os.environ.get("SKIP_DB_TESTS"):
        pytest.skip("SUPABASE_DB_URL not set or SKIP_DB_TESTS set")
    return url


def _once(db_url: str, statement):
    """One query on a throwaway loop, for the session scoped lookups."""

    async def go():
        engine = create_async_engine(db_url, poolclass=NullPool, connect_args=CONNECT_ARGS)
        try:
            async with AsyncSession(engine) as s:
                return await s.scalar(statement)
        finally:
            await engine.dispose()

    return asyncio.run(go())


@pytest.fixture(scope="session")
def me_id(db_url) -> uuid.UUID:
    override = os.environ.get("TEST_ACCOUNT_ID")
    if override:
        return uuid.UUID(override)

    account_id = _once(
        db_url,
        select(Account.id)
        .where(Account.role.in_([AccountRole.LAB_OWNER, AccountRole.LAB_ADMIN]))
        .where(Account.active.is_(True))
        .order_by(Account.username)
        .limit(1),
    )
    if account_id is None:
        pytest.skip("No active admin account to run as; set TEST_ACCOUNT_ID")
    return account_id


@pytest.fixture(scope="session")
def lab_user_id(db_url) -> uuid.UUID:
    """An existing plain member, for the "not allowed" and "only sees their
    own" checks. Nothing is ever written as them."""
    account_id = _once(
        db_url,
        select(Account.id)
        .where(Account.role == AccountRole.LAB_USER)
        .where(Account.active.is_(True))
        .where(Account.quota.is_(None))
        .order_by(Account.username)
        .limit(1),
    )
    if account_id is None:
        pytest.skip("No active Lab User account in this database")
    return account_id


@pytest.fixture
def client(db_url, me_id):
    """The app with its session pointed at a per-test engine and the Supabase
    token check replaced. `client.login(account_id)` changes the caller."""
    engine = create_async_engine(
        db_url, pool_size=3, max_overflow=2, pool_pre_ping=True, connect_args=CONNECT_ARGS
    )
    current = {"id": me_id, "email": None}

    async def test_session():
        async with AsyncSession(engine, expire_on_commit=False) as s:
            yield s

    def fake_auth_user():
        return SimpleNamespace(id=str(current["id"]), email=current["email"])

    app.dependency_overrides[getSession] = test_session
    app.dependency_overrides[account_service.get_current_auth_user] = fake_auth_user

    # The context manager keeps one event loop for the whole test, which is
    # what lets the pooled connections be reused across requests.
    with TestClient(app) as tc:
        tc.engine = engine
        tc.me_id = me_id
        tc.login = lambda account_id, email=None: current.update(id=account_id, email=email)
        tc.as_me = lambda: current.update(id=me_id, email=None)
        yield tc
        tc.portal.call(engine.dispose)

    app.dependency_overrides.clear()


class DB:
    """Seeding, lookups and cleanup, all on the client's loop."""

    def __init__(self, client: TestClient):
        self.client = client
        self.engine = client.engine
        self.me_id: uuid.UUID = client.me_id
        self._me_username: str | None = None
        self.tracked: dict[str, set] = defaultdict(set)
        self.logins: set[uuid.UUID] = set()
        self.category_id: int = self.run(self._make_category)
        self.track("category", self.category_id)

    # -- plumbing ------------------------------------------------------------

    def run(self, fn, *args):
        return self.client.portal.call(fn, *args)

    def session(self) -> AsyncSession:
        return AsyncSession(self.engine, expire_on_commit=False)

    async def _make_category(self) -> int:
        async with self.session() as s:
            category = Category(name=unique())
            s.add(category)
            await s.commit()
            return category.id

    def track(self, table: str, row_id) -> None:
        """Remember a row this test is responsible for. Tables: ticket, task,
        announcement, category, account."""
        self.tracked[table].add(row_id)
        if table == "account":
            self.logins.add(row_id)

    # -- seeding -------------------------------------------------------------

    def seed_ticket(self, name: str = "pytest ticket", **fields) -> int:
        fields.setdefault("status", TicketStatus.PENDING)

        async def go():
            async with self.session() as s:
                ticket = Ticket(
                    category_id=self.category_id, created_by=self.me_id, **fields
                )
                ticket.name = name
                s.add(ticket)
                await s.commit()
                return ticket.id

        ticket_id = self.run(go)
        self.track("ticket", ticket_id)
        return ticket_id

    def seed_task(
        self, name: str = "pytest task", assignees: list[uuid.UUID] | None = None, **fields
    ) -> int:
        fields.setdefault("status", TaskStatus.IN_PROGRESS)
        fields.setdefault("due_date", func.now())

        async def go():
            async with self.session() as s:
                task = Task(
                    name=name, category_id=self.category_id, created_by=self.me_id, **fields
                )
                if assignees:
                    found = await s.scalars(select(Account).where(Account.id.in_(assignees)))
                    task.assignees = list(found.all())
                s.add(task)
                await s.commit()
                return task.id

        task_id = self.run(go)
        self.track("task", task_id)
        return task_id

    def seed_announcement(self, name: str = "pytest announcement", **fields) -> int:
        async def go():
            async with self.session() as s:
                row = Announcement(name=name, created_by=self.me_id, **fields)
                s.add(row)
                await s.commit()
                return row.id

        row_id = self.run(go)
        self.track("announcement", row_id)
        return row_id

    # -- lookups -------------------------------------------------------------

    def fetch(self, model, pk):
        async def go():
            async with self.session() as s:
                return await s.get(model, pk)

        return self.run(go)

    def scalar(self, statement):
        async def go():
            async with self.session() as s:
                return await s.scalar(statement)

        return self.run(go)

    def scalars(self, statement) -> list:
        async def go():
            async with self.session() as s:
                return (await s.scalars(statement)).all()

        return self.run(go)

    @property
    def me_username(self) -> str:
        """The caller's username, which is how the audit log records assignees."""
        if self._me_username is None:
            self._me_username = self.scalar(
                select(Account.username).where(Account.id == self.me_id)
            )
        return self._me_username

    def audit_rows(self, table: str, row_id) -> list[AuditLog]:
        return self.scalars(
            select(AuditLog)
            .where(AuditLog.from_table == table, AuditLog.row_id == str(row_id))
            .order_by(AuditLog.id)
        )

    # -- cleanup -------------------------------------------------------------

    async def _cleanup(self) -> None:
        async with self.session() as s:
            # Anything filed under the test category counts, tracked or not.
            for table, model in (("ticket", Ticket), ("task", Task)):
                extra = await s.scalars(
                    select(model.id).where(model.category_id == self.category_id)
                )
                self.tracked[table] |= set(extra.all())

            for table, ids in self.tracked.items():
                if ids:
                    await s.execute(
                        delete(AuditLog).where(
                            AuditLog.from_table == table,
                            AuditLog.row_id.in_([str(i) for i in ids]),
                        )
                    )

            for table, model in (
                ("task", Task),
                ("ticket", Ticket),
                ("announcement", Announcement),
                ("category", Category),
                ("account", Account),
            ):
                if self.tracked[table]:
                    await s.execute(delete(model).where(model.id.in_(self.tracked[table])))
            await s.commit()

        for login in self.logins:
            # Already gone when the DELETE endpoint did its job.
            with suppress(Exception):
                supabase.auth.admin.delete_user(str(login))


@pytest.fixture
def db(client) -> DB:
    helper = DB(client)
    yield helper
    client.as_me()
    helper.run(helper._cleanup)
