"""The /ticket endpoints against the real database.

Where the unit tests check what the handler asked the session to do, these
check what actually ended up in Postgres: rows, constraints, ordering and the
audit trail. See conftest.py for the isolation rules.
"""

import datetime as dt
import uuid

import pytest

from sqlalchemy import func, select

from app.model import Account, Category, Ticket, TicketStatus
from tests.integration.conftest import AUTH_HEADER

DUE = dt.datetime(2030, 1, 15, 9, 0, tzinfo=dt.timezone.utc)

# The database trigger trg_ticket_due_date_eod rewrites every due_date to the
# last microsecond of that day in UTC+7 (23:59:59.999999 Bangkok time), so
# whatever instant the API is sent, this is what the row holds.
DUE_END_OF_DAY = dt.datetime(2030, 1, 15, 16, 59, 59, 999999, tzinfo=dt.timezone.utc)


def test_create_ticket_persists_row_and_audit_trail(client, db):
    response = client.post(
        "/ticket/",
        json={
            "name": "pytest create",
            "description": "written by the integration suite",
            "category_id": db.category_id,
            "due_date": "2030-01-15T16:00:00+07:00",
        },
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    ticket_id = response.json()["id"]
    db.track("ticket", ticket_id)

    row = db.fetch(Ticket, ticket_id)
    assert row is not None
    assert row.status is TicketStatus.PENDING
    assert row.created_by == db.me_id
    assert row.category_id == db.category_id
    assert row.due_date == DUE_END_OF_DAY
    assert row.created is not None and row.updated is not None

    audit = db.audit_rows("ticket", ticket_id)
    assert {r.column_name for r in audit} == {
        "name", "description", "status", "category_id", "due_date"
    }
    assert all(r.old_value is None and r.by_whom == db.me_id for r in audit)
    by_col = {r.column_name: r.new_value for r in audit}
    assert by_col["name"] == "pytest create"
    assert by_col["status"] == "pending"
    assert by_col["category_id"] == str(db.category_id)


def test_create_ticket_unknown_category_writes_nothing(client, db):
    missing = db.scalar(select(func.max(Category.id))) + 1000

    response = client.post(
        "/ticket/",
        json={"name": "pytest orphan", "category_id": missing},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"

    assert db.scalar(
        select(func.count()).select_from(Ticket).where(Ticket.name == "pytest orphan")
    ) == 0


def test_retrieve_by_id_and_by_search(client, db):
    token = uuid.uuid4().hex[:10]
    ticket_id = db.seed_ticket(name=f"pytest search {token}", due_date=DUE)

    by_id = client.get("/ticket/", params={"ticket_id": ticket_id}, headers=AUTH_HEADER)
    assert by_id.status_code == 200
    assert [t["id"] for t in by_id.json()["Tickets"]] == [ticket_id]

    by_name = client.get("/ticket/", params={"search": token.upper()}, headers=AUTH_HEADER)
    assert [t["id"] for t in by_name.json()["Tickets"]] == [ticket_id]

    by_number = client.get("/ticket/", params={"search": str(ticket_id)}, headers=AUTH_HEADER)
    assert ticket_id in [t["id"] for t in by_number.json()["Tickets"]]


def test_get_count_reports_total_regardless_of_limit(client, db):
    for i in range(3):
        db.seed_ticket(name=f"pytest count {i}", due_date=DUE)

    response = client.get(
        "/ticket/",
        params={"category_id": db.category_id, "get_count": True, "limit": 1},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["TicketCount"] == 3
    assert len(body["Tickets"]) == 1


def test_admin_sees_pending_then_rejected_then_accepted(client, db):
    db.seed_ticket(name="pytest accepted", status=TicketStatus.ACCEPTED, due_date=DUE)
    db.seed_ticket(name="pytest rejected", status=TicketStatus.REJECTED, due_date=DUE)
    db.seed_ticket(name="pytest pending", status=TicketStatus.PENDING, due_date=DUE)

    response = client.get(
        "/ticket/", params={"category_id": db.category_id}, headers=AUTH_HEADER
    )

    assert response.status_code == 200
    assert [t["status"] for t in response.json()["Tickets"]] == [
        "pending", "rejected", "accepted"
    ]


def test_update_persists_change_and_audits_only_changed_column(client, db):
    ticket_id = db.seed_ticket(name="pytest before", due_date=DUE)

    response = client.put(
        f"/ticket/{ticket_id}",
        json={"name": "pytest after", "status": "pending"},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "pytest after"

    row = db.fetch(Ticket, ticket_id)
    assert row.name == "pytest after"
    assert row.status is TicketStatus.PENDING

    # Seeded directly, so the only audit rows are the ones this PUT wrote.
    audit = db.audit_rows("ticket", ticket_id)
    assert [(r.column_name, r.old_value, r.new_value) for r in audit] == [
        ("name", "pytest before", "pytest after")
    ]


def test_delete_removes_row_and_keeps_audit_of_old_values(client, db):
    ticket_id = db.seed_ticket(name="pytest doomed", description="bye", due_date=DUE)

    response = client.delete(f"/ticket/{ticket_id}", headers=AUTH_HEADER)

    assert response.status_code == 200
    assert db.fetch(Ticket, ticket_id) is None

    audit = db.audit_rows("ticket", ticket_id)
    by_col = {r.column_name: r.old_value for r in audit}
    assert set(by_col) == {"name", "description", "status", "category_id", "due_date"}
    assert by_col["name"] == "pytest doomed"
    assert by_col["description"] == "bye"
    assert all(r.new_value is None for r in audit)

    assert client.delete(f"/ticket/{ticket_id}", headers=AUTH_HEADER).status_code == 404


def test_deactivated_account_is_turned_away(client, db):
    account_id = db.scalar(select(Account.id).where(Account.active.is_(False)).limit(1))
    if account_id is None:
        pytest.skip("No deactivated account in this database")

    client.login(account_id)
    response = client.get("/ticket/", headers=AUTH_HEADER)

    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]
