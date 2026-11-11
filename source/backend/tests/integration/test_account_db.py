"""The /account endpoints against the real database and real Supabase auth.

These create throwaway logins. Each one is tracked, and the teardown deletes
the account row and the Supabase user even if the test fails halfway.
"""

import uuid

import pytest
from supabase_auth.errors import AuthApiError

from app.dependencies import supabase
from app.model import Account, AccountRole
from app.service import account_service
from tests.integration.conftest import AUTH_HEADER

PASSWORD = "pytest-Secret-123"


def new_identity() -> tuple[str, str]:
    token = uuid.uuid4().hex[:8]
    return f"pytest-{token}", f"pytest-{token}@example.com"


def login_exists(user_id: uuid.UUID) -> bool:
    try:
        return supabase.auth.admin.get_user_by_id(str(user_id)).user is not None
    except AuthApiError:
        return False


def create_user(client, db, kind: str = "member", **extra) -> uuid.UUID:
    username, email = new_identity()
    response = client.post(
        "/account/admin",
        json={"username": username, "email": email, "password": PASSWORD, "kind": kind, **extra},
        headers=AUTH_HEADER,
    )
    assert response.status_code == 201, response.text
    user_id = uuid.UUID(response.json()["Account"]["id"])
    db.track("account", user_id)
    return user_id


def test_admin_creates_trial_user_with_login_and_audit(client, db):
    user_id = create_user(client, db, kind="trial")

    row = db.fetch(Account, user_id)
    assert (row.role, row.quota, row.active) == (AccountRole.LAB_USER, 10, True)
    assert login_exists(user_id)

    audit = {r.column_name: r.new_value for r in db.audit_rows("account", user_id)}
    assert audit == {"created": row.username, "quota": "10"}

    duplicate = client.post(
        "/account/admin",
        json={"username": row.username, "email": "other@example.com", "password": PASSWORD},
        headers=AUTH_HEADER,
    )
    assert duplicate.status_code == 409


def test_user_claims_their_own_account_row(client, db):
    username, email = new_identity()
    user_id = db.run(account_service.create_auth_user, email, PASSWORD, username)
    db.track("account", user_id)
    # POST /account/ copies the address off the Supabase user, so the fake
    # token has to carry it.
    client.login(user_id, email=email)

    first = client.post("/account/", json={"username": username}, headers=AUTH_HEADER)
    again = client.post("/account/", json={"username": "ignored"}, headers=AUTH_HEADER)

    assert first.status_code == 201, first.text
    assert again.status_code == 201
    assert again.json()["Message"] == "Account already set up"
    row = db.fetch(Account, user_id)
    assert (row.username, row.email, row.role) == (username, email, AccountRole.LAB_USER)


def test_account_visibility_rules(client, db):
    user_id = create_user(client, db)

    as_admin = client.get(f"/account/{user_id}", headers=AUTH_HEADER)
    assert as_admin.status_code == 200
    assert str(user_id) in [a["id"] for a in client.get("/account/", headers=AUTH_HEADER).json()["Accounts"]]

    client.login(user_id)
    own = client.get(f"/account/{user_id}", headers=AUTH_HEADER)
    other = client.get(f"/account/{db.me_id}", headers=AUTH_HEADER)
    assert own.status_code == 200
    assert other.status_code == 403


def test_admin_updates_quota_and_deactivates(client, db):
    user_id = create_user(client, db)

    response = client.put(
        f"/account/{user_id}", json={"quota": 3, "active": False}, headers=AUTH_HEADER
    )
    assert response.status_code == 200, response.text
    row = db.fetch(Account, user_id)
    assert (row.quota, row.active) == (3, False)

    client.login(user_id)
    assert client.get("/ticket/", headers=AUTH_HEADER).status_code == 403

    client.as_me()
    client.put(f"/account/{user_id}", json={"active": True}, headers=AUTH_HEADER)
    audit = [(r.column_name, r.old_value, r.new_value) for r in db.audit_rows("account", user_id)]
    assert ("quota", None, "3") in audit
    assert ("active", "True", "False") in audit
    assert ("active", "False", "True") in audit


def test_member_cannot_touch_quota_or_active(client, db):
    user_id = create_user(client, db)
    client.login(user_id)

    response = client.put(f"/account/{user_id}", json={"quota": 99}, headers=AUTH_HEADER)

    assert response.status_code == 403
    assert db.fetch(Account, user_id).quota is None


def test_assign_role_rules(client, db):
    user_id = create_user(client, db)

    promoted = client.put(f"/account/{user_id}/role", json={"role": "Lab Admin"}, headers=AUTH_HEADER)
    assert promoted.status_code == 200, promoted.text
    assert db.fetch(Account, user_id).role is AccountRole.LAB_ADMIN

    owner = client.put(f"/account/{user_id}/role", json={"role": "Lab Owner"}, headers=AUTH_HEADER)
    assert owner.status_code == 403

    me = client.put(f"/account/{db.me_id}/role", json={"role": "Lab User"}, headers=AUTH_HEADER)
    assert me.status_code == 409


def test_user_changes_own_password_and_email(client, db):
    user_id = create_user(client, db)
    client.login(user_id)

    password = client.put(
        f"/account/{user_id}/password",
        json={"current_password": PASSWORD, "new_password": PASSWORD + "-new"},
        headers=AUTH_HEADER,
    )
    assert password.status_code == 200, password.text

    wrong = client.put(
        f"/account/{user_id}/password",
        json={"current_password": PASSWORD, "new_password": "whatever-123"},
        headers=AUTH_HEADER,
    )
    assert wrong.status_code == 403

    _, new_email = new_identity()
    email = client.put(
        f"/account/{user_id}/email",
        json={"email": new_email, "password": PASSWORD + "-new"},
        headers=AUTH_HEADER,
    )
    assert email.status_code == 200, email.text
    assert db.fetch(Account, user_id).email == new_email
    assert supabase.auth.admin.get_user_by_id(str(user_id)).user.email == new_email

    columns = [r.column_name for r in db.audit_rows("account", user_id)]
    assert columns.count("password") == 1
    assert "email" in columns


def test_delete_account_removes_row_and_login(client, db):
    user_id = create_user(client, db)

    response = client.delete(f"/account/{user_id}", headers=AUTH_HEADER)

    assert response.status_code == 200, response.text
    assert response.json()["Message"].startswith("Successfully deleted")
    assert db.fetch(Account, user_id) is None
    assert not login_exists(user_id)

    assert client.delete(f"/account/{db.me_id}", headers=AUTH_HEADER).status_code == 409
    assert client.delete(f"/account/{user_id}", headers=AUTH_HEADER).status_code == 404
