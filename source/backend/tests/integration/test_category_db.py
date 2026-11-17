"""The /category endpoints against the real database."""

from sqlalchemy import select

from app.model import Category
from tests.integration.conftest import AUTH_HEADER, unique


def create_category(client, db, name: str) -> int:
    response = client.post("/category/", json={"name": name}, headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    category_id = db.scalar(select(Category.id).where(Category.name == name))
    assert category_id is not None
    db.track("category", category_id)
    return category_id


def test_create_category_persists_and_audits(client, db):
    name = unique()

    category_id = create_category(client, db, name)

    assert db.fetch(Category, category_id).name == name
    audit = db.audit_rows("category", category_id)
    assert [(r.column_name, r.old_value, r.new_value) for r in audit] == [("name", None, name)]
    assert audit[0].by_whom == db.me_id


def test_retrieve_categories_lists_and_fetches_by_id(client, db):
    listing = client.get("/category/", headers=AUTH_HEADER)
    assert listing.status_code == 200
    assert db.category_id in [c["id"] for c in listing.json()["Categories"]]

    one = client.get(f"/category/{db.category_id}", headers=AUTH_HEADER)
    assert one.status_code == 200
    assert one.json()["Category"]["id"] == db.category_id

    missing = client.get("/category/999999999", headers=AUTH_HEADER)
    assert missing.status_code == 404


def test_update_category_renames_and_audits_only_real_changes(client, db):
    old = db.fetch(Category, db.category_id).name
    new = unique("renamed")

    response = client.put(f"/category/{db.category_id}", json={"name": new}, headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    assert db.fetch(Category, db.category_id).name == new

    # Same name again: nothing to record.
    again = client.put(f"/category/{db.category_id}", json={"name": new}, headers=AUTH_HEADER)
    assert again.status_code == 200

    audit = db.audit_rows("category", db.category_id)
    assert [(r.old_value, r.new_value) for r in audit] == [(old, new)]


def test_delete_category_removes_row_and_keeps_audit(client, db):
    name = unique("doomed")
    category_id = create_category(client, db, name)

    response = client.delete(f"/category/{category_id}", headers=AUTH_HEADER)

    assert response.status_code == 200
    assert db.fetch(Category, category_id) is None
    audit = db.audit_rows("category", category_id)
    assert [(r.old_value, r.new_value) for r in audit] == [(None, name), (name, None)]

    assert client.delete(f"/category/{category_id}", headers=AUTH_HEADER).status_code == 404


def test_lab_user_cannot_write_categories(client, db, lab_user_id):
    client.login(lab_user_id)
    name = unique("forbidden")

    create = client.post("/category/", json={"name": name}, headers=AUTH_HEADER)
    update = client.put(f"/category/{db.category_id}", json={"name": name}, headers=AUTH_HEADER)
    remove = client.delete(f"/category/{db.category_id}", headers=AUTH_HEADER)

    assert (create.status_code, update.status_code, remove.status_code) == (403, 403, 403)
    assert db.scalar(select(Category.id).where(Category.name == name)) is None
    assert db.fetch(Category, db.category_id) is not None
