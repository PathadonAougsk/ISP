# Labrador — Test Documentation

> **Document type:** Test documentation (Lecture 13 §3E)
> **Audience:** whoever writes or runs the tests — currently every team member
> **Suite:** `source/backend/tests/` · pytest 9 · **61 collected cases**
> (49 test functions, expanded by parametrization)
> **Last verified by collection:** 2026-11-12

---

## 1. Test strategy

### What is tested, and at which level

| Level | Status | Where |
| --- | --- | --- |
| **Unit** (handler logic in isolation) | **none today** | — |
| **Integration** (HTTP → FastAPI → real Postgres → assertions on rows) | 61 cases | `tests/integration/` |
| **Constraint / database** (direct inserts that bypass the API) | part of the above | `test_constraints_db.py` |
| **System / smoke** (both containers come up healthy) | automated per PR | `.github/workflows/Docker-build-check.yml` |
| **Acceptance** (requirements verified against the SRS) | **manual**, undocumented | — |
| **Frontend / component / E2E** | **none** | — |

The suite is deliberately integration-first. The thing most likely to break in
this project is the agreement between the handlers, the Supabase schema and the
permission rules — so the tests drive the real app through `TestClient` against
the **real Supabase database** and then assert on the rows and the audit trail,
rather than on what a mock was asked to do.

Each test answers three questions where they apply:

1. **Did the request get the right answer?** (status code, response body)
2. **Is the database in the right state?** (the row, and nothing else written)
3. **Is the change auditable?** (one `audit_log` row per changed column, none
   for a no-op)

### What "pass" means

Green means the endpoint behaved correctly *against a live Supabase project
with real Auth*. It does **not** cover the frontend, nor concurrency, nor
performance. A skipped suite (no database configured) is not a pass.

## 2. Test environment

| Requirement | Detail |
| --- | --- |
| Python | 3.13+, dependencies via `uv sync` (`pytest` is in the `dev` group) |
| Config | `source/.env`, loaded by `tests/conftest.py` **before** any `app.*` import |
| Database | A live Supabase project — `SUPABASE_DB_URL` |
| Auth | A live Supabase project — the account tests create and delete real logins |
| Seed data | At least one **active admin** account and one **active Lab User** with no quota |

`tests/conftest.py` fills placeholder values for the Supabase variables when
`source/.env` is absent, so **collection always works**; the database tests then
skip themselves rather than erroring.

| Variable | Effect |
| --- | --- |
| `SUPABASE_DB_URL` | Unset → every database test skips |
| `SKIP_DB_TESTS` | Set to anything → every database test skips (use for a collection-only check) |
| `TEST_ACCOUNT_ID` | Run as this account instead of the first active admin found |

Two session fixtures pick the accounts the suite acts as:

- `me_id` — the caller: `TEST_ACCOUNT_ID`, or the first active Lab Owner/Lab
  Admin by username. None found → skip with *"No active admin account to run
  as; set TEST_ACCOUNT_ID"*.
- `lab_user_id` — an existing active Lab User with no quota, used only for the
  "not allowed" and "only sees their own" checks. **Nothing is ever written as
  them.** None found → skip.

## 3. How the tests stay safe on a shared database

This is the part to read before adding a test. The rules are enforced by
`tests/integration/conftest.py`:

- **Only the bearer-token check is faked.** `get_current_auth_user` is
  overridden to return a chosen account id; `get_current_account`,
  `require_admin`, `outranks()` and every row filter run for real. Permission
  tests therefore test the real gates.
- `client.login(account_id)` switches the caller mid-test;
  `client.as_me()` switches back (the teardown always does).
- **Every row a test writes is tracked** and deleted afterwards, together with
  its `audit_log` rows. Tickets and tasks are filed under a **category created
  for that test**, and teardown sweeps everything in that category whether it
  was tracked or not.
- Accounts created through the API have their **Supabase login deleted too**,
  even when the test fails halfway.
- Creation audit rows written before the row has an id (`row_id == "None"`) are
  cleaned up by actor and timestamp.
- **One event loop.** All database work goes through `db.run(...)`, which
  executes on the `TestClient`'s own loop, so one pooled engine serves both the
  app and the assertions. The engine copies the pooler `connect_args` from
  `app/database.py`.

The `db` fixture also provides `seed_ticket()`, `seed_task()`,
`seed_announcement()`, `fetch()`, `scalar()`, `scalars()`, `audit_rows()` and
`track()`. Use them instead of hand-rolled SQL, or the teardown will not know
what to clean up.

## 4. Test inventory

### `test_system_db.py` — 2 cases

| Test | Verifies |
| --- | --- |
| `test_health` | `GET /health` answers without auth |
| `test_db_check_reaches_supabase` | `GET /db` really reaches Supabase |

### `test_ticket_db.py` — 8 cases

| Test | Verifies |
| --- | --- |
| `test_create_ticket_persists_row_and_audit_trail` | The row lands, status forced to `pending`, one audit row per field, due date rewritten to end of the Bangkok day |
| `test_create_ticket_unknown_category_writes_nothing` | `404` and **no** partial write |
| `test_retrieve_by_id_and_by_search` | `ticket_id`, name search, and digit search matching the id |
| `test_get_count_reports_total_regardless_of_limit` | `TicketCount` is the total before `limit`/`offset` |
| `test_admin_sees_pending_then_rejected_then_accepted` | The admin queue ordering |
| `test_update_persists_change_and_audits_only_changed_column` | A no-op field logs nothing |
| `test_delete_removes_row_and_keeps_audit_of_old_values` | Old values survive the delete |
| `test_deactivated_account_is_turned_away` | `403` for a deactivated caller |

### `test_task_db.py` — 7 cases

| Test | Verifies |
| --- | --- |
| `test_create_task_persists_row_and_assignees` | Row + `task_assigned_to` links |
| `test_create_task_audit_row_points_at_the_task` | The creation audit row |
| `test_retrieve_tasks_filters_search_and_count` | Filters, search, `TaskCount` |
| `test_lab_user_only_sees_tasks_assigned_to_them` | The Lab User row filter |
| `test_update_task_persists_and_audits_changes` | Per-column audit rows |
| `test_delete_task_removes_row` / `test_delete_missing_task_is_404` | Delete and `404` |

### `test_category_db.py` — 5 cases

Create (+audit), list and fetch by id, rename auditing **only real** changes,
delete keeping the audit, and `test_lab_user_cannot_write_categories` (the
admin gate).

### `test_announcement_db.py` — 5 cases

Create (+audit), newest-first ordering with `limit`, update auditing only
changed columns, delete keeping the audit, and
`test_lab_user_can_read_but_not_write`.

### `test_account_db.py` — 8 cases

| Test | Verifies |
| --- | --- |
| `test_admin_creates_trial_user_with_login_and_audit` | Both halves created: account row **and** Supabase login, with quota audit |
| `test_user_claims_their_own_account_row` | `POST /account/` is idempotent |
| `test_account_visibility_rules` | Own row readable; others admin-only |
| `test_admin_updates_quota_and_deactivates` | Quota and `active` by an admin |
| `test_member_cannot_touch_quota_or_active` | `403` for a plain member |
| `test_assign_role_rules` | Owner not grantable, no self role change |
| `test_user_changes_own_password_and_email` | Against real Supabase Auth |
| `test_delete_account_removes_row_and_login` | Both halves removed |

### `test_audit_log_db.py` — 3 cases

Listing with the actor's username joined in, fetch by id plus the `404`, and
`test_audit_log_is_admin_only`.

### `test_constraints_db.py` — 23 cases (parametrized)

Checks both layers: **the API must refuse with a 4xx and store nothing**, and
**the database must refuse the same value on a direct insert**, so the limits
hold for anything that bypasses the API.

| Group | Cases |
| --- | --- |
| `name`/`description` exactly at the limit are stored | ticket, task, announcement |
| One character over the limit is `422` | ticket, task, announcement × name, description |
| An over-limit `PUT` is `422` and leaves the row alone | 1 |
| `category.name` and `username` limits | 2 |
| Duplicate category name → `409` | 1 |
| Category with tickets cannot be deleted (`RESTRICT`) | 1 |
| Duplicate username / email → `409` | 1 |
| `quota` cannot go negative (`account_quota_check`) | 1 |
| The database limits are inclusive, on direct insert | description × tables, category name |

## 5. Running the tests

```bash
cd source/backend

# everything (needs source/.env pointing at a live Supabase project)
uv run pytest

# quieter, one line per test
uv run pytest -q

# one file / one test
uv run pytest tests/integration/test_ticket_db.py
uv run pytest -k "quota"

# collection only — no database needed, proves imports and fixtures are sane
SKIP_DB_TESTS=1 uv run pytest --collect-only -q

# run as a specific account
TEST_ACCOUNT_ID=<uuid> uv run pytest
```

Inside the running container:

```bash
docker compose -f docker-compose.dev.yaml exec fastapi uv run pytest
```

`pyproject.toml` sets `testpaths = ["tests"]` and `pythonpath = ["."]`, so
plain `pytest` from `source/backend` finds everything.

**Expect skips, not failures,** when no database is configured. A `skip` for
"No active Lab User account in this database" means the project needs that seed
account, not that the code is broken.

## 6. Recording results

The suite is run locally before opening a PR. Use this form in the PR
description or an iteration report:

```
Suite:    source/backend/tests        Date: YYYY-MM-DD
Command:  uv run pytest -q            Environment: <supabase project>
Result:   NN passed, NN skipped, NN failed   (NNs)
Skipped:  <reason, e.g. no active Lab User seeded>
Failures: <test id> — <what broke> — <issue/PR>
```

Known-failure handling: a test that is expected to fail gets an
`xfail`/`skip` with a reason that names the issue — never a deleted or
commented-out test.

## 7. Gaps and risks

| Gap | Risk | Suggested next step |
| --- | --- | --- |
| **No frontend tests at all** | The whole UI — route guard, caching, forms, role-dependent rendering — is only ever checked by hand | Start with a smoke E2E (sign in → file a ticket → see it) and unit tests for `lib/format.ts` and the cache layer |
| **No unit tests** | Every test needs a live Supabase, so nothing runs offline or in CI | Extract pure logic (`datetime_utils`, `outranks`, quota rules) and test it with no I/O |
| **CI does not run the suite** | Only "both images build and are healthy" is gated; a broken endpoint can merge | Run the unit layer in CI once it exists, or add a seeded test Supabase project |
| **Tests share one live project** | A concurrent run or a crashed teardown can leave `pytest …` rows behind | Keep using the `db` fixture; consider a dedicated test project |
| **Schema objects live only in Supabase** | `test_constraints_db.py` depends on `migrations/001_length_limits.sql`, and `test_ticket_db.py` on the trigger `trg_ticket_due_date_eod` — neither is in the repository | Commit the SQL (and ideally adopt a migration tool) so the database layer is reproducible |
| **Ownership gap is untested because it is unimplemented** | Nothing fails when any member edits any ticket or task by id | Decide the rule, implement it, then add the test |
| **No acceptance-test documentation** | The SRS requirements are not traceably verified | Map each SRS requirement to a test id or a manual script |
| **No load or concurrency tests** | The quota gate is concurrency-sensitive by design, and untested under concurrency | Two simultaneous `POST /ticket/` on a quota of 1 should yield exactly one ticket |
