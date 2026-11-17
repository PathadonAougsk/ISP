"""Database constraints: length limits, unique keys, the quota check and the
RESTRICT foreign keys.

Two layers are checked. The API layer must refuse a bad value with a 4xx and
store nothing. The database layer must refuse the same value on a direct
insert, so the limits still hold for anything that bypasses the API.

The limits come from app/limits.py and are inclusive. The database side needs
migrations/001_length_limits.sql to have been applied.
"""

import uuid

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import DBAPIError

from app.limits import CATEGORY_NAME_MAX, DESCRIPTION_MAX, NAME_MAX, USERNAME_MAX
from app.model import Account, Announcement, Category, Task, Ticket
from tests.integration.conftest import AUTH_HEADER, unique


def long(n: int, stem: str = "pytest ") -> str:
    """A string of exactly n characters that still starts with the pytest marker."""
    return (stem + uuid.uuid4().hex)[:n].ljust(n, "x")


def count_named(db, model, name: str) -> int:
    return db.scalar(select(func.count()).select_from(model).where(model.name == name))


# --- API layer: names and descriptions ---------------------------------------


@pytest.mark.parametrize(
    "path, model, extra",
    [
        ("/ticket/", Ticket, {}),
        ("/task/", Task, {"due_date": "2030-03-01T00:00:00+00:00"}),
        ("/announcement/", Announcement, {}),
    ],
    ids=["ticket", "task", "announcement"],
)
def test_name_and_description_at_the_limit_are_stored(client, db, path, model, extra):
    name = long(NAME_MAX)
    description = long(DESCRIPTION_MAX)

    response = client.post(
        path,
        json={"name": name, "description": description, "category_id": db.category_id, **extra},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    row_id = body["id"] if "id" in body else body["Task"]["id"]
    db.track(path.strip("/"), row_id)

    row = db.fetch(model, row_id)
    assert len(row.name) == NAME_MAX
    assert len(row.description) == DESCRIPTION_MAX


@pytest.mark.parametrize(
    "path, model, extra",
    [
        ("/ticket/", Ticket, {}),
        ("/task/", Task, {"due_date": "2030-03-01T00:00:00+00:00"}),
        ("/announcement/", Announcement, {}),
    ],
    ids=["ticket", "task", "announcement"],
)
@pytest.mark.parametrize(
    "field, size",
    [("name", NAME_MAX + 1), ("description", DESCRIPTION_MAX + 1), ("name", 0)],
    ids=["name-too-long", "description-too-long", "name-empty"],
)
def test_name_and_description_over_the_limit_are_422(client, db, path, model, extra, field, size):
    payload = {"name": long(60), "description": "ok", "category_id": db.category_id, **extra}
    payload[field] = long(size) if size else ""

    response = client.post(path, json=payload, headers=AUTH_HEADER)

    assert response.status_code == 422, response.text
    assert count_named(db, model, payload["name"]) == 0


def test_update_over_the_limit_is_422_and_leaves_the_row_alone(client, db):
    ticket_id = db.seed_ticket(name="pytest untouched")

    response = client.put(
        f"/ticket/{ticket_id}", json={"description": long(DESCRIPTION_MAX + 1)}, headers=AUTH_HEADER
    )

    assert response.status_code == 422
    assert db.fetch(Ticket, ticket_id).description is None


# --- API layer: category name and username ------------------------------------


def test_category_name_limit(client, db):
    ok = long(CATEGORY_NAME_MAX)
    too_long = long(CATEGORY_NAME_MAX + 1)

    accepted = client.post("/category/", json={"name": ok}, headers=AUTH_HEADER)
    refused = client.post("/category/", json={"name": too_long}, headers=AUTH_HEADER)

    assert accepted.status_code == 200, accepted.text
    created_id = db.scalar(select(Category.id).where(Category.name == ok))
    db.track("category", created_id)
    assert refused.status_code == 422
    assert count_named(db, Category, too_long) == 0


def test_username_limit_on_admin_create(client, db):
    too_long = long(USERNAME_MAX + 1, "pytest-").replace(" ", "-")

    response = client.post(
        "/account/admin",
        json={"username": too_long, "email": f"{uuid.uuid4().hex[:8]}@example.com", "password": "pytest-Secret-123"},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(Account).where(Account.username == too_long)) == 0


# --- unique keys and foreign keys ----------------------------------------------


def test_duplicate_category_name_is_409(client, db):
    taken = db.fetch(Category, db.category_id).name
    other = unique("other")
    assert client.post("/category/", json={"name": other}, headers=AUTH_HEADER).status_code == 200
    other_id = db.scalar(select(Category.id).where(Category.name == other))
    db.track("category", other_id)

    create = client.post("/category/", json={"name": taken}, headers=AUTH_HEADER)
    rename = client.put(f"/category/{other_id}", json={"name": taken}, headers=AUTH_HEADER)

    assert create.status_code == 409, create.text
    assert rename.status_code == 409, rename.text
    assert count_named(db, Category, taken) == 1
    assert db.fetch(Category, other_id).name == other


def test_category_with_tickets_cannot_be_deleted(client, db):
    db.seed_ticket(name="pytest anchor")

    response = client.delete(f"/category/{db.category_id}", headers=AUTH_HEADER)

    assert response.status_code == 409, response.text
    assert "still has tickets or tasks" in response.json()["detail"]
    assert db.fetch(Category, db.category_id) is not None


def test_duplicate_username_and_email_are_409(client, db):
    me = db.fetch(Account, db.me_id)

    same_username = client.post(
        "/account/admin",
        json={"username": me.username, "email": f"{uuid.uuid4().hex[:8]}@example.com", "password": "pytest-Secret-123"},
        headers=AUTH_HEADER,
    )
    same_email = client.post(
        "/account/admin",
        json={"username": unique("pytest-"), "email": me.email, "password": "pytest-Secret-123"},
        headers=AUTH_HEADER,
    )

    assert same_username.status_code == 409
    assert same_email.status_code == 409
    assert db.scalar(select(func.count()).select_from(Account).where(Account.username == me.username)) == 1


def test_quota_cannot_go_negative(client, db):
    via_api = client.put(f"/account/{db.me_id}", json={"quota": -1}, headers=AUTH_HEADER)
    assert via_api.status_code == 422

    # Straight at the table, inside a transaction that is always rolled back.
    async def direct():
        async with db.session() as s:
            try:
                await s.execute(update(Account).where(Account.id == db.me_id).values(quota=-1))
            except DBAPIError as exc:
                return "account_quota_check" in str(exc.orig)
            finally:
                await s.rollback()
            return False

    assert db.run(direct) is True
    assert db.fetch(Account, db.me_id).quota is None or db.fetch(Account, db.me_id).quota >= 0


# --- database layer: the columns themselves enforce the same limits ------------


def _direct_insert_ok(db, sql: str, params: dict) -> bool:
    """True if the row went in (then rolled back), False if Postgres refused."""

    async def go():
        async with db.session() as s:
            try:
                await s.execute(text(sql), params)
                return True
            except DBAPIError:
                return False
            finally:
                await s.rollback()

    return db.run(go)


@pytest.mark.parametrize("table", ["ticket", "task", "announcement"])
def test_database_description_limit_is_inclusive(db, table):
    due = ", due_date" if table == "task" else ""
    due_value = ", now()" if table == "task" else ""
    category = ", category_id" if table != "announcement" else ""
    category_value = ", :category" if table != "announcement" else ""
    sql = (
        f"insert into {table} (name, description, created_by{category}{due}) "
        f"values (:name, :description, :me{category_value}{due_value})"
    )
    params = {"name": "pytest direct", "me": db.me_id, "category": db.category_id}

    assert _direct_insert_ok(db, sql, {**params, "description": long(DESCRIPTION_MAX)}) is True
    assert _direct_insert_ok(db, sql, {**params, "description": long(DESCRIPTION_MAX + 1)}) is False
    assert _direct_insert_ok(db, sql, {**params, "name": long(NAME_MAX), "description": "x"}) is True
    assert _direct_insert_ok(db, sql, {**params, "name": long(NAME_MAX + 1), "description": "x"}) is False


def test_database_category_name_limit_is_inclusive(db):
    sql = "insert into category (name) values (:name)"

    assert _direct_insert_ok(db, sql, {"name": long(CATEGORY_NAME_MAX)}) is True
    assert _direct_insert_ok(db, sql, {"name": long(CATEGORY_NAME_MAX + 1)}) is False
