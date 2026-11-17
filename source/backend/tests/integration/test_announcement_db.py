"""The /announcement endpoints against the real database."""

from app.model import Announcement
from tests.integration.conftest import AUTH_HEADER, unique


def test_create_announcement_persists_and_audits(client, db):
    name = unique("notice")

    response = client.post(
        "/announcement/", json={"name": name, "description": "lab closed"}, headers=AUTH_HEADER
    )

    assert response.status_code == 200, response.text
    announcement_id = response.json()["id"]
    db.track("announcement", announcement_id)

    row = db.fetch(Announcement, announcement_id)
    assert (row.name, row.description, row.created_by) == (name, "lab closed", db.me_id)
    audit = db.audit_rows("announcement", announcement_id)
    assert {(r.column_name, r.new_value) for r in audit} == {
        ("name", name), ("description", "lab closed")
    }


def test_retrieve_announcements_newest_first_with_limit(client, db):
    older = db.seed_announcement(name=unique("older"))
    newer = db.seed_announcement(name=unique("newer"))

    response = client.get("/announcement/", params={"limit": 2}, headers=AUTH_HEADER)

    assert response.status_code == 200
    ids = [a["id"] for a in response.json()["Announcements"]]
    assert len(ids) == 2
    assert ids.index(newer) < ids.index(older)


def test_update_announcement_audits_only_changed_columns(client, db):
    announcement_id = db.seed_announcement(name="pytest before", description="same")

    response = client.put(
        f"/announcement/{announcement_id}",
        json={"name": "pytest after", "description": "same"},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    row = db.fetch(Announcement, announcement_id)
    assert (row.name, row.description) == ("pytest after", "same")
    audit = db.audit_rows("announcement", announcement_id)
    assert [(r.column_name, r.old_value, r.new_value) for r in audit] == [
        ("name", "pytest before", "pytest after")
    ]


def test_delete_announcement_removes_row_and_keeps_audit(client, db):
    announcement_id = db.seed_announcement(name="pytest doomed", description="bye")

    response = client.delete(f"/announcement/{announcement_id}", headers=AUTH_HEADER)

    assert response.status_code == 200
    assert db.fetch(Announcement, announcement_id) is None
    audit = db.audit_rows("announcement", announcement_id)
    assert {(r.column_name, r.old_value, r.new_value) for r in audit} == {
        ("name", "pytest doomed", None), ("description", "bye", None)
    }
    assert client.delete(f"/announcement/{announcement_id}", headers=AUTH_HEADER).status_code == 404


def test_lab_user_can_read_but_not_write(client, db, lab_user_id):
    announcement_id = db.seed_announcement(name=unique("readonly"))
    client.login(lab_user_id)

    listing = client.get("/announcement/", params={"limit": 50}, headers=AUTH_HEADER)
    create = client.post("/announcement/", json={"name": "nope"}, headers=AUTH_HEADER)
    remove = client.delete(f"/announcement/{announcement_id}", headers=AUTH_HEADER)

    assert listing.status_code == 200
    assert (create.status_code, remove.status_code) == (403, 403)
    assert db.fetch(Announcement, announcement_id) is not None
