"""The /task endpoints against the real database."""

import pytest

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


@pytest.mark.xfail(
    strict=True,
    reason="create_task builds the audit row before flush, so row_id is the string 'None'",
)
def test_create_task_audit_row_points_at_the_task(client, db):
    response = client.post(
        "/task/", json={"name": unique("task"), "category_id": db.category_id, "due_date": DUE},
        headers=AUTH_HEADER,
    )
    task_id = response.json()["Task"]["id"]
    db.track("task", task_id)

    assert [r.column_name for r in db.audit_rows("task", task_id)] == ["status"]


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
    assert audit["status"] == ("TaskStatus.IN_PROGRESS", "TaskStatus.COMPLETED")
    assert "assignees" in audit

    assert client.put("/task/999999999", json={"name": "x"}, headers=AUTH_HEADER).status_code == 404


def test_delete_task_removes_row(client, db):
    task_id = db.seed_task(name="pytest doomed", assignees=[db.me_id])

    response = client.delete(f"/task/{task_id}", headers=AUTH_HEADER)

    assert response.status_code == 200
    assert db.fetch(Task, task_id) is None


@pytest.mark.xfail(
    strict=True,
    reason="delete_task reads task.id before the None check, so a missing task is a 500 not a 404",
)
def test_delete_missing_task_is_404(client, db):
    response = client.delete("/task/999999999", headers=AUTH_HEADER)

    assert response.status_code == 404
