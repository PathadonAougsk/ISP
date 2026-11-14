# Labrador — API Documentation

> **Document type:** API documentation (Lecture 13 §3B)
> **Audience:** developers calling the Labrador backend — the Next.js frontend,
> integration tests, and any future client
> **Backend:** FastAPI, Python 3.13 · **Base URL (dev):** `http://localhost:8000`
> **Interactive reference:** `http://localhost:8000/docs` (Swagger UI,
> generated from the code — always the final word on shapes)

This file documents the endpoints as they behave today. The older
`API-guide.tex` in this folder covers only tickets and tasks and still
describes `PATCH`; the live API uses `PUT`.

---

## 1. Authentication

Labrador does not issue its own tokens. The browser signs in to **Supabase
Auth**, and every request carries that access token:

```
Authorization: Bearer <supabase access token>
```

Every router is mounted behind `get_current_auth_user`, so **every endpoint
except `/health` and `/db` requires a valid token**. Endpoints that need to
know *who* is calling additionally resolve the `account` row behind the token.

| Failure | Status | Body (`detail`) |
| --- | --- | --- |
| No `Authorization` header | 401 | `Not authenticated` |
| Token invalid or expired | 401 | `Invalid or expired token` |
| Token valid, no account row | 404 | `Account not found` |
| Account row deactivated | 403 | `This account is deactivated. Ask a Lab Owner or Lab Admin to turn it back on.` |
| Admin-only endpoint, plain member | 403 | `Only a Lab Owner or Lab Admin can do this` |

The frontend attaches the header centrally in `src/lib/api.ts` (`apiFetch`),
with a 15-second timeout.

**CORS:** the backend allows exactly one origin, `http://localhost:3000`, with
credentials, all methods and all headers.

## 2. Conventions

### Response envelopes

Responses are **not** uniform — each endpoint's shape is listed below. Common
forms:

```jsonc
{ "Tickets": [ … ], "TicketCount": 42 }   // list + optional total
{ "Account": { … }, "Message": "Updated username" }
{ "Message": "Successfully deleted alice" }
{ … }                                      // the bare row (ticket, announcement)
```

### Errors

FastAPI's standard shape. The frontend surfaces `detail` directly, so the
message text is part of the contract:

```json
{ "detail": "Category not found" }
```

| Status | Meaning in Labrador |
| --- | --- |
| 400 | Contradictory query parameters (e.g. `onlyOwned` and `notOwned` both true) |
| 401 | Missing/invalid token, or a Lab Admin editing another Lab Admin |
| 403 | Authenticated but not allowed: role gate, deactivated account, wrong password, quota exhausted |
| 404 | Row not found (ticket, task, category, announcement, account, audit entry) |
| 409 | Conflict: duplicate username/email/category name, row still referenced, forbidden self-action |
| 422 | Request body or query failed validation (length limits, blank username, bad enum) |
| 502 | Supabase answered, but not with what we need |

One `403` carries a structured body rather than a string — the quota gate:

```json
{ "detail": { "message": "Ticket quota exhausted", "code": "quota_exhausted", "quota": 0 } }
```

### Field limits

Validated by Pydantic *before* the database, so a too-long value is a `422`.
Mirrored in `app/limits.py`:

| Field | Limit |
| --- | --- |
| `name` (ticket, task, announcement) | 1–255 |
| `description` | ≤ 1000 |
| `username` | 1–30 |
| category `name` | 1–30 |
| `password` | 8–72 (72 is the bcrypt ceiling) |
| `quota` | ≥ 0 |

### Dates and times

All timestamps are stored and returned in **UTC**. Inputs without a timezone
are read as **Bangkok wall clock (UTC+7)**, never as the server's zone.

A **due date** is anchored to the *end* of the Bangkok day:
`"2026-10-11"` → `2026-10-11T16:59:59.999999Z`. This is idempotent — sending a
stored due date straight back produces the same value, so a save that does not
touch the due date cannot move the deadline or log a false change.

### Enums

Sent and returned as their lowercase values:

| Enum | Values |
| --- | --- |
| `TicketStatus` | `pending`, `accepted`, `rejected` |
| `TaskStatus` | `in_progress`, `completed` |
| `AccountRole` | `Lab Owner`, `Lab Admin`, `Lab User` |

### Partial updates

Every `PUT` is a partial update: omit a field and it is left alone. Two
exceptions are documented inline below (announcement `description`, and
`PUT /account/{id}` which distinguishes "omitted" from "sent as null").

---

## 3. System endpoints

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| `GET` | `/health` | none | `["Ok"]` — the process is up |
| `GET` | `/db` | none | `["Ok"]` if Supabase answers, else `["Not Ok"]` |

Used by the Docker healthchecks (see the system documentation).

## 4. Tickets — `/ticket`

### `GET /ticket/`

Lists tickets. **A Lab User only ever sees tickets they created**; that filter
is applied server-side and cannot be turned off by a query parameter.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `ticket_id` | int | — | Exact id |
| `search` | str | — | Case-insensitive match on `name`; an all-digit value also matches the id |
| `status` | enum | — | `pending` \| `accepted` \| `rejected` |
| `category_id` | int | — | |
| `due_after` / `due_before` | datetime | — | Inclusive; naive values read as Bangkok time |
| `onlyOwned` | bool | `false` | Only tickets you created (admins) |
| `notOwned` | bool | `false` | Only tickets you did not create (admins) |
| `get_count` | bool | `false` | Also return `TicketCount`, the total **before** `limit`/`offset` |
| `offset` | int ≥ 0 | `0` | |
| `limit` | int ≥ 0 | `0` | **`0` means no limit** |

`onlyOwned` and `notOwned` together → `400`.

**Ordering** depends on the caller's role: admins get
`pending → rejected → accepted`, then due date — the queue they work from.
A Lab User gets due date first, then that same status order.

```jsonc
{ "Tickets": [ { "id": 12, "name": "Calibrate scale", "description": null,
                 "status": "pending", "category_id": 3,
                 "created_by": "…uuid…", "assigned_id": null,
                 "completed_by": null, "completed_at": null,
                 "created": "2026-11-01T04:12:09Z", "updated": "…",
                 "due_date": "2026-11-05T16:59:59.999999Z" } ],
  "TicketCount": 1 }
```

### `POST /ticket/`

```json
{ "name": "Calibrate scale", "description": "Bench 2", "category_id": 3,
  "due_date": "2026-11-05" }
```

Status is always forced to `pending`; `created_by` is the caller. Returns the
bare ticket row.

**Quota:** if the caller's `quota` is not null, the insert is gated by an
atomic `UPDATE account SET quota = quota - 1 WHERE quota > 0 RETURNING quota`.
The decrement *is* the gate, so two tickets filed at once off a quota of 1
cannot both succeed. Nothing left → `403 quota_exhausted` and no ticket.

Unknown `category_id` → `404 Category not found` (and no quota is spent).

**Audit:** one `audit_log` row per field (`name`, `description`, `status`,
`category_id`, `due_date`), plus one for the quota decrement.

### `PUT /ticket/{ticket_id}`

Partial update of `name`, `description`, `status`, `category_id`, `due_date`.
Unknown ticket → `404`; unknown category → `404`. Writes one audit row per
**actually changed** column — a no-op write logs nothing. Returns the bare row.

### `DELETE /ticket/{ticket_id}`

Logs the old value of every field (new value `null`), then deletes.
→ `{ "message": "Ticket deleted successfully" }`

> **Known gap:** `PUT` and `DELETE` check authentication and that the row
> exists, but not ownership or role. Any active account that knows a ticket id
> can edit or delete it. See the developer guide, §8.

## 5. Tasks — `/task`

### `GET /task/`

**A Lab User only sees tasks they are assigned to.** Assignees are eager-loaded
and returned with each task.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | int | — | |
| `search` | str | — | As for tickets |
| `categories` | int | — | A single category id |
| `assignsTo` | uuid | — | Tasks assigned to this account |
| `notassignsTo` | uuid | — | Tasks *not* assigned to this account |
| `status` | enum | — | `in_progress` \| `completed` |
| `due_after` / `due_before` | datetime | — | |
| `get_count` | bool | `false` | Adds `TaskCount` |
| `limit` | int ≥ 0 | `20` | |
| `offset` | int ≥ 0 | `0` | |

→ `{ "Tasks": [ … ], "TaskCount": 7 }`

### `POST /task/`

```json
{ "name": "Rerun assay", "description": null, "status": "in_progress",
  "category_id": 3, "due_date": "2026-11-20",
  "assignees": ["…uuid…", "…uuid…"] }
```

Ids in `assignees` that match no account are silently dropped.
→ `{ "Task": { … , "assignees": [ … ] } }`

> **Rough edges here, unlike `POST /ticket/`:**
> - `due_date` is optional in the request model but `NOT NULL` in the database,
>   so omitting it fails as an unhandled `IntegrityError` (500), not a clean 422.
> - `category_id` is not checked, so an unknown category also fails at the
>   database rather than as `404`.
> - Exactly one audit row is written (`status`), and because it is built before
>   the flush its `row_id` is the string `"None"` instead of the new task id.

### `PUT /task/{task_id}` · `DELETE /task/{task_id}`

Partial update (`name`, `description`, `status`, `category_id`, `due_date`,
`assignees`), one audit row per changed column; `assignees` is replaced
wholesale. `404` when the id is unknown.
Delete → `{ "Message": "Task {id} has been successfully deleted" }`

The same ownership gap as tickets applies.

## 6. Categories — `/category`

| Method | Path | Who | Response |
| --- | --- | --- | --- |
| `GET` | `/category/` | any member | `{ "Categories": [ { "id", "name" } ] }` |
| `GET` | `/category/{id}` | any member | `{ "Category": { … } }` |
| `POST` | `/category/` | **admin** | `{ "Message": "Succesfuly Create new category" }` |
| `PUT` | `/category/{id}` | **admin** | `{ "Message": "Succesfuly update <name> category" }` |
| `DELETE` | `/category/{id}` | **admin** | `{ "Message": "Succesfuly delete category" }` |

Body for create and update: `{ "name": "Calibration" }` (1–30 chars).

- Duplicate name → `409` (the name is `UNIQUE`).
- Deleting a category still used by a ticket or task → `409 "<name> still has
  tickets or tasks. Move them first."` (`ON DELETE RESTRICT` in Postgres).

## 7. Announcements — `/announcement`

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/announcement/` | any member |
| `POST` | `/announcement/` | **admin** |
| `PUT` | `/announcement/{id}` | **admin** |
| `DELETE` | `/announcement/{id}` | **admin** |

`GET` takes `offset` (≥0) and `limit` (≥0, `0` = no limit), ordered **newest
first**. → `{ "Announcements": [ … ] }`

`POST` and `PUT` take `{ "name", "description" }`; create and update return the
bare announcement row, delete returns
`{ "message": "Announcement deleted successfully" }`.

> **Quirk:** on `PUT`, `name` is only applied when non-null, but `description`
> is applied unconditionally — **omitting `description` clears it**. Send the
> existing description back when you only mean to rename.

## 8. Audit log — `/audit-log` (admin only)

### `GET /audit-log/`

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | int 1–500 | `200` | |
| `offset` | int ≥ 0 | `0` | |
| `from_table` | str ≤64 | — | `ticket`, `task`, `category`, `account`, `announcement` |
| `row_id` | str ≤36 | — | The changed row's id as text (uuid or integer) |
| `by_whom` | uuid | — | Actor |

Each entry is serialized with the actor's username joined in:

```json
{ "id": 901, "from_table": "ticket", "row_id": "12", "column_name": "status",
  "old_value": "pending", "new_value": "accepted",
  "by_whom": "…uuid…", "by_username": "alice",
  "occurred_at": "2026-11-02T08:30:00Z" }
```

### `GET /audit-log/{id}`

→ `{ "AuditLog": { … } }`, or `404`.

The log is **append-only from the API**: there is no create, update or delete
endpoint. Rows are written by the handlers themselves, one per changed column.
Deleting a record leaves its log entries behind (`by_whom` is
`ON DELETE SET NULL`, so the trail survives the actor too).

## 9. Accounts — `/account`

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `GET` | `/account/` | any member | Every account (used to resolve usernames) |
| `GET` | `/account/{id}` | self, or admin | One account |
| `POST` | `/account/` | the user themselves | Claim the account row behind an existing login |
| `PUT` | `/account/{id}` | self, or admin | `username`, and `quota`/`active` for admins |
| `PUT` | `/account/{id}/email` | self, or someone who outranks | Change the login email |
| `PUT` | `/account/{id}/password` | self, or someone who outranks | Change the password |
| `DELETE` | `/account/{id}` | **admin** | Delete the row *and* the Supabase login |
| `POST` | `/account/admin` | **admin** | Create login + account row in one call |
| `PUT` | `/account/{id}/role` | **admin** | Promote / demote |

### `POST /account/admin` — create a member

```json
{ "username": "alice", "email": "alice@example.com", "password": "…",
  "kind": "trial", "quota": 10 }
```

- `kind`: `member` (no quota — unlimited) or `trial` (capped; defaults to 10).
- Everyone is created as **Lab User**; promotion is a separate call.
- The email is marked confirmed, so the member can sign in immediately. Nothing
  is emailed — the admin passes the password on.
- Availability is checked *before* the Supabase login is created, so a clash
  never leaves an orphaned login behind. If the account insert still fails, the
  login just created is deleted again.
- → `201 { "Account": { … }, "Message": "Created alice as a trial" }`

Conflicts name the constraint that actually failed: `That username is already
taken`, `That email address is already taken`, `An account already exists for
that login`, `Quota cannot be negative`, or — when the address is held by a
Supabase login with no account row — a message telling the admin to remove
that user from the Supabase dashboard.

### `PUT /account/{id}`

```json
{ "username": "alice2", "quota": 5, "active": true }
```

Field presence matters: `quota: null` *clears* the cap, while omitting `quota`
leaves it untouched. Rules:

- A plain member may only edit **themselves**, and only `username` — sending
  `quota` or `active` → `403`.
- A Lab Admin cannot edit another **Lab Admin** → `401`; only a Lab Owner can.
- You cannot deactivate **yourself** → `409`.
- A **Lab Owner** cannot be deactivated → `409`.
- Nothing actually changed → `200 { "Message": "Nothing to update" }`.
- Otherwise → `{ "Account": { … }, "Message": "Updated username, quota" }`.

### `PUT /account/{id}/email` · `PUT /account/{id}/password`

Both take the caller's **current password** and may target either their own
login or one belonging to somebody they strictly outrank
(Owner > Admin > User) — so no admin can reset a peer's or an Owner's login.

```jsonc
// email
{ "email": "new@example.com", "password": "<current password>" }
// password
{ "current_password": "…", "new_password": "…" }      // 8–72 chars
```

The current password is verified against Supabase by attempting a sign-in
(then signing that one session out again, `local` so the user's own browser is
unaffected). Wrong password → `403 "That is not your current password"`; a
Supabase outage or rate limit is reported as `502`, never as a wrong password.

The email change updates Supabase first, then mirrors it into `account.email`;
if the mirror fails the Supabase address is rolled back. An address already in
use → `409`.

### `PUT /account/{id}/role`

```json
{ "role": "Lab Admin" }
```

- Granting or removing **Lab Owner** → `403`; that is dashboard-only, both ways.
- Changing **your own** role → `409` (it could drop the last admin).
- Already that role → `200 "<username> is already Lab Admin"`.
- → `{ "Account": { … }, "Message": "alice is now Lab Admin" }`

### `DELETE /account/{id}`

Admin only. Refuses to delete **yourself** (`409`) or a **Lab Owner** (`409`).
A member who still owns tasks, tickets or announcements cannot be deleted
(`created_by` is `ON DELETE RESTRICT`) → `409 "… still owns tasks, tickets or
announcements. Deactivate the account instead."`

After the row is gone, the Supabase login is removed too — otherwise that
email address stays reserved forever. If only the login removal fails, the
response says so and names the address to clean up by hand.

### `POST /account/` — claim your own row

For a login that exists in Supabase with no `account` row yet
(`{ "username": "alice" }`). Idempotent: called again it returns the existing
row with `"Account already set up"`.

---

## 10. Example session

```bash
# Token: sign in through Supabase (the browser does this via @supabase/ssr)
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"…"}' | jq -r .access_token)

# Is the API up, and can it reach the database?
curl -s localhost:8000/health && curl -s localhost:8000/db

# What categories exist?
curl -s localhost:8000/category/ -H "Authorization: Bearer $TOKEN"

# File a ticket due at the end of 5 Nov 2026, Bangkok time
curl -s -X POST localhost:8000/ticket/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Calibrate scale","category_id":3,"due_date":"2026-11-05"}'

# First page of pending tickets, with the total
curl -s "localhost:8000/ticket/?status=pending&get_count=true&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Accept ticket 12 (admin)
curl -s -X PUT localhost:8000/ticket/12 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}'

# Who changed ticket 12? (admin)
curl -s "localhost:8000/audit-log/?from_table=ticket&row_id=12" \
  -H "Authorization: Bearer $TOKEN"
```
