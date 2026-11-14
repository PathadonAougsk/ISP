"""The /task endpoints against the real database."""

from app.model import Task, TaskStatus
from tests.integration.conftest import AUTH_HEADER, unique

DUE = "2030-02-01T12:00:00+00:00"
# The task table carries the same trigger as ticket: due_date is snapped to
# the last microsecond of that day in UTC+7.
DUE_END_OF_DAY = "2030-02-01T16:59:59.999999+00:00"


def test_create_task_persists_row_and_assignees(client, db):
    name = unique("task")

    response = client.post(
        "/task/",
        json={
            "name": name,
            "description": "calibrate",
            "category_id": db.category_id,
            "due_date": DUE,
            "assignees": [str(db.me_id)],
        },
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    task_id = response.json()["Task"]["id"]
    db.track("task", task_id)

    row = db.fetch(Task, task_id)
    assert (row.name, row.status, row.created_by) == (name, TaskStatus.IN_PROGRESS, db.me_id)
    assert row.due_date.isoformat() == DUE_END_OF_DAY

    mine = client.get("/task/", params={"id": task_id}, headers=AUTH_HEADER)
    assert [a["id"] for a in mine.json()["Tasks"][0]["assignees"]] == [str(db.me_id)]


def test_create_task_audits_every_filled_column(client, db):
    name = unique("task")
    response = client.post(
        "/task/",
        json={
            "name": name,
            "category_id": db.category_id,
            "due_date": DUE,
            "assignees": [str(db.me_id)],
        },
        headers=AUTH_HEADER,
    )
    task_id = response.json()["Task"]["id"]
    db.track("task", task_id)

    audit = db.audit_rows("task", task_id)
    # row_id points at the task, not at the string "None" from an unflushed id.
    assert {r.column_name for r in audit} == {
        "name", "status", "category_id", "due_date", "assignees"
    }
    assert all(r.old_value is None and r.by_whom == db.me_id for r in audit)
    by_col = {r.column_name: r.new_value for r in audit}
    assert by_col["name"] == name
    assert by_col["status"] == "in_progress"
    assert by_col["category_id"] == str(db.category_id)
    assert by_col["assignees"] == db.me_username


def test_retrieve_tasks_filters_search_and_count(client, db):
    token = unique("find")
    wanted = db.seed_task(name=token)
    db.seed_task(name=unique("other"))
    db.seed_task(name=unique("other"), status=TaskStatus.COMPLETED)

    by_category = client.get(
        "/task/", params={"categories": db.category_id, "get_count": True, "limit": 1},
        headers=AUTH_HEADER,
    )
    assert by_category.status_code == 200
    assert by_category.json()["TaskCount"] == 3
    assert len(by_category.json()["Tasks"]) == 1

    by_search = client.get("/task/", params={"search": token}, headers=AUTH_HEADER)
    assert [t["id"] for t in by_search.json()["Tasks"]] == [wanted]

    completed = client.get(
        "/task/", params={"categories": db.category_id, "status": "completed"}, headers=AUTH_HEADER
    )
    assert [t["status"] for t in completed.json()["Tasks"]] == ["completed"]

    assert client.get("/task/", params={"id": 999999999}, headers=AUTH_HEADER).status_code == 404


def test_lab_user_only_sees_tasks_assigned_to_them(client, db, lab_user_id):
    theirs = db.seed_task(name=unique("theirs"), assignees=[lab_user_id])
    db.seed_task(name=unique("not theirs"), assignees=[db.me_id])

    client.login(lab_user_id)
    response = client.get("/task/", params={"categories": db.category_id}, headers=AUTH_HEADER)

    assert response.status_code == 200
    assert [t["id"] for t in response.json()["Tasks"]] == [theirs]


def test_update_task_persists_and_audits_changes(client, db):
    task_id = db.seed_task(name="pytest before", assignees=[db.me_id])

    response = client.put(
        f"/task/{task_id}",
        json={"name": "pytest after", "status": "completed", "assignees": []},
        headers=AUTH_HEADER,
    )

    assert response.status_code == 200, response.text
    row = db.fetch(Task, task_id)
    assert (row.name, row.status) == ("pytest after", TaskStatus.COMPLETED)
    assert response.json()["Task"]["assignees"] == []

    audit = {r.column_name: (r.old_value, r.new_value) for r in db.audit_rows("task", task_id)}
    assert audit["name"] == ("pytest before", "pytest after")
    # The status value as the enum stores it, the same as a create writes.
    assert audit["status"] == ("in_progress", "completed")
    # Assignees by username on both sides, so the two are comparable at all.
    assert audit["assignees"] == (db.me_username, None)
    # Nothing else was in the body, so nothing else may be logged.
    assert set(audit) == {"name", "status", "assignees"}

    assert client.put("/task/999999999", json={"name": "x"}, headers=AUTH_HEADER).status_code == 404


def test_update_task_does_not_audit_an_unchanged_assignee_list(client, db):
    task_id = db.seed_task(name="pytest same", assignees=[db.me_id])

    response = client.put(
        f"/task/{task_id}", json={"assignees": [str(db.me_id)]}, headers=AUTH_HEADER
    )

    assert response.status_code == 200, response.text
    assert db.audit_rows("task", task_id) == []


def test_delete_task_removes_row_and_keeps_audit_of_old_values(client, db):
    task_id = db.seed_task(name="pytest doomed", description="bye", assignees=[db.me_id])

    response = client.delete(f"/task/{task_id}", headers=AUTH_HEADER)

    assert response.status_code == 200
    assert db.fetch(Task, task_id) is None

    audit = db.audit_rows("task", task_id)
    by_col = {r.column_name: r.old_value for r in audit}
    assert set(by_col) == {"name", "description", "status", "category_id", "due_date", "assignees"}
    assert by_col["name"] == "pytest doomed"
    assert by_col["description"] == "bye"
    assert by_col["status"] == "in_progress"
    assert by_col["assignees"] == db.me_username
    assert all(r.new_value is None for r in audit)


def test_delete_missing_task_is_404(client, db):
    response = client.delete("/task/999999999", headers=AUTH_HEADER)

    assert response.status_code == 404
