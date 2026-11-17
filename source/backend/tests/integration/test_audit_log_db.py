"""The /audit-log endpoints against the real database."""

from sqlalchemy import select

from app.model import Account, Category
from tests.integration.conftest import AUTH_HEADER, unique


def test_audit_log_lists_rows_with_actor_username(client, db):
    name = unique()
    assert client.post("/category/", json={"name": name}, headers=AUTH_HEADER).status_code == 200
    category_id = db.scalar(select(Category.id).where(Category.name == name))
    db.track("category", category_id)
    my_username = db.scalar(select(Account.username).where(Account.id == db.me_id))

    response = client.get(
        "/audit-log/",
        params={"from_table": "category", "row_id": str(category_id)},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200
    rows = response.json()["AuditLogs"]
    assert len(rows) == 1
    assert rows[0]["new_value"] == name
    assert rows[0]["by_whom"] == str(db.me_id)
    assert rows[0]["by_username"] == my_username


def test_audit_log_fetch_by_id_and_missing(client, db):
    announcement_id = db.seed_announcement(name=unique("audited"))
    client.put(f"/announcement/{announcement_id}", json={"name": "pytest edited"}, headers=AUTH_HEADER)
    entry_id = db.audit_rows("announcement", announcement_id)[0].id

    one = client.get(f"/audit-log/{entry_id}", headers=AUTH_HEADER)
    assert one.status_code == 200
    assert one.json()["AuditLog"]["new_value"] == "pytest edited"

    assert client.get("/audit-log/999999999999", headers=AUTH_HEADER).status_code == 404


def test_audit_log_is_admin_only(client, db, lab_user_id):
    client.login(lab_user_id)

    assert client.get("/audit-log/", headers=AUTH_HEADER).status_code == 403
    assert client.get("/audit-log/1", headers=AUTH_HEADER).status_code == 403
