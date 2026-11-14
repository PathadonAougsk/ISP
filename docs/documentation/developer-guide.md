# Labrador — Developer Guide

> **Document type:** Developer documentation (Lecture 13 §3C)
> **Audience:** team members and future contributors working in this repository
> **Prerequisites:** Docker + Docker Compose, Git. For running outside Docker:
> Python 3.13+ with [uv](https://docs.astral.sh/uv/) (the image uses 3.14),
> Node 20+ with npm (the image uses Node 24).

---

## 1. Getting the project running

```bash
git clone <repo> && cd ISP
# Secrets live in one shared file, read by BOTH services via env_file
cp /path/to/shared/.env source/.env     # ask the team; never committed
docker compose -f docker-compose.dev.yaml up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| Frontend (Next.js) | http://localhost:3000 | Hot reload via `WATCHPACK_POLLING` |
| Backend (FastAPI) | http://localhost:8000 | Hot reload via `WATCHFILES_FORCE_POLLING` |
| Swagger UI | http://localhost:8000/docs | Generated from the code |

Both containers bind-mount their source directory, so an edit on the host
reloads inside the container. `node_modules` and `.next` are masked by
anonymous volumes so the host's copies never shadow the container's.

Outside Docker:

```bash
cd source/backend && uv sync && uv run fastapi dev app/main.py   # :8000
cd source/frontend && npm install && npm run dev                 # :3000
```

`source/.env` must exist before either starts — `app/dependencies.py` and
`app/database.py` raise at **import time** when a key is missing. See the
system documentation for the key list.

## 2. Repository layout

```
ISP/
├── docker-compose.dev.yaml      # both services, dev mode
├── docs/                        # specs, diagrams, reports, this documentation
│   ├── documentation/            # user guide, API, developer, system, test docs
│   ├── lectures/                 # course lecture notes
│   ├── activity_diagram/ sequence_diagram/ use_case_diagram/  # .json sources
│   └── gantt_chart/
├── .github/workflows/
│   └── Docker-build-check.yml   # PR gate: both images build and come up healthy
└── source/
    ├── .env                     # shared secrets (gitignored)
    ├── backend/
    │   ├── pyproject.toml        # deps + pytest config, managed by uv
    │   ├── Dockerfile.dev
    │   ├── app/
    │   │   ├── main.py           # app, CORS, /health, /db, router wiring
    │   │   ├── model.py          # SQLAlchemy ORM — the schema of record
    │   │   ├── database.py       # async engine, session factory, getSession
    │   │   ├── dependencies.py   # Supabase clients from env
    │   │   ├── limits.py         # column length limits, shared with the routers
    │   │   ├── datetime_utils.py # Bangkok ↔ UTC, due-date anchoring
    │   │   ├── routers/          # one module per resource: HTTP + validation
    │   │   └── service/          # auth, permissions, shared helpers
    │   └── tests/                # pytest; see test-documentation.md
    └── frontend/
        ├── package.json
        ├── Dockerfile.dev
        └── src/
            ├── proxy.ts          # route guard: no session → /auth
            ├── app/              # App Router: (home) public, (contents) private
            ├── components/       # per-feature folders + ui/ primitives
            └── lib/              # api client, per-resource fetchers, cache, format
```

## 3. Backend architecture

```
HTTP request
    │
    ▼
routers/<resource>.py ── Pydantic request model (validation, length limits)
    │                  └─ Depends(get_current_auth_user)  → token is valid
    │                  └─ Depends(get_current_account)     → who, role, active
    │                  └─ Depends(require_admin)           → admin-only routes
    ▼
service/<resource>_service.py ── permissions, Supabase Auth calls, audit helpers
    │
    ▼
model.py (SQLAlchemy ORM) ── AsyncSession from database.getSession
    │
    ▼
Supabase Postgres (+ Supabase Auth for logins)
```

Three layers, three jobs:

- **`routers/`** — HTTP shape only: query parameters, request models, status
  codes, and the audit rows for what it changed.
- **`service/`** — anything shared or privileged: who may do what
  (`is_admin`, `outranks`, `require_admin`), the Supabase Auth admin calls, and
  per-resource `audit_*` / `get_*_or_404` helpers.
- **`model.py`** — the schema of record: tables, enums, constraints, indexes
  and relationships. `python -m app.database` creates the tables from it.

### Conventions that are not obvious

**Every change is audited, one row per changed column.** The pattern is the
same in every router: build a candidate `AuditLog`, drop it when
`old_value == new_value`, add the survivors, commit once. A no-op `PUT` must
write no log rows — there are tests for exactly that.

**`PUT` is a partial update.** `None` means "not sent". Where "sent as null"
has to be distinguishable from "omitted" (clearing a quota), read
`body.model_fields_set` rather than the value — `PUT /account/{id}` does this.

**Length limits live in one place.** `app/limits.py` holds the numbers; the
Pydantic `Field(max_length=…)` in the routers and the `String(n)` in
`model.py` both point at the same constants, so a too-long value is a `422`
before it ever reaches Postgres.

**Datetimes go through `app/datetime_utils.py`.** Never construct a timestamp
by hand: `to_utc()` reads a naive value as Bangkok wall clock, and
`to_due_date()` anchors a date to the end of the Bangkok day so re-saving a
record cannot move its deadline. The frontend hardcodes the same zone in
`src/lib/format.ts`.

**Enums store their values, not their names** — `in_progress`, not
`IN_PROGRESS`. That is what `values_callable=_enum_values` in `model.py` is for;
changing it silently breaks every existing row.

**Deletes rely on Postgres, not the ORM.** `category.tasks` and
`category.tickets` use `passive_deletes=True` so a delete actually hits the
`ON DELETE RESTRICT` and surfaces as a `409`; without it the ORM would try to
`NULL` the children first and fail on `NOT NULL` instead. The `IntegrityError`
is caught and turned into a message that says what to do
("Move them first", "Deactivate the account instead").

**Supabase's Python client is blocking.** Every call to it goes through
`run_in_threadpool` (see `account_service`), so it cannot stall the event loop.

**The `account` table only mirrors `auth.users`.** Supabase Auth owns logins
and reserves email addresses; `account` holds username, role, quota and active.
Anything that creates or deletes a member has to keep both halves consistent —
`admin_create_account` and `delete_account` are the worked examples, including
what they do when one half fails.

**Database pooling is tuned for the Supabase transaction pooler**, which cannot
keep prepared statements between requests. Hence
`statement_cache_size=0` and the uuid-suffixed statement names in
`database.py`. Copy that `connect_args` into any new engine (the tests do).

## 4. Frontend architecture

- **Routing.** `src/app/(home)` is public (landing, `/auth`);
  `src/app/(contents)` is the signed-in shell (sidebar + topbar + page).
  `src/proxy.ts` redirects any request without a Supabase session to `/auth`
  for `/dashboard`, `/request-table`, `/announcement`, `/setting`, `/report`.
- **API access.** Always through `src/lib/api.ts`: `apiFetch` attaches the
  bearer token and a 15s timeout, `apiSendJson` posts JSON, `apiDetail` pulls
  FastAPI's `detail` out of an error so the member rules reach the user in the
  backend's own words. One module per resource (`lib/ticket.ts`, `lib/task.ts`,
  `lib/account.ts`, …) wraps the endpoints and types.
- **Caching.** `src/lib/cache/` is a small Cache-API layer with generation
  guards; clicking the current page in the sidebar calls `clearAllApiCache()`
  and reloads. If you add an endpoint whose data is cached, make sure a
  mutation path invalidates it.
- **Components.** Feature folders (`components/request-table/`,
  `dashboard/`, `announcement/`, `settings/`) over shared primitives in
  `components/ui/` (modal, form-modal, table, pagination, toggle, date-input…).
  Reach for a `ui/` primitive before writing a new one.
- **Styling.** Tailwind v4 with CSS custom properties for theme colours
  (`bg-(--panel-bg)`), defined in `src/app/globals.css`. Use the variables, not
  raw hex.
- **Settings is a panel, not a route** — `SettingsProvider` + `useSettings()`
  open it over the current page.

## 5. Adding an endpoint — worked checklist

1. **Model.** If the shape changes, edit `app/model.py` (and `app/limits.py`
   when a length is involved). Apply the change to Supabase, then verify
   `python -m app.database` agrees.
2. **Request model.** A Pydantic `BaseModel` in the router with explicit
   `Field` bounds taken from `limits.py`.
3. **Dependencies.** `get_current_account` when you need the caller's role or
   identity; `require_admin` for an admin-only route. Plain
   `get_current_auth_user` only when neither is needed.
4. **Permissions.** Decide, and write down, who may call it — including whether
   a Lab User may see or touch rows that are not theirs. Put reusable checks in
   the service layer.
5. **Audit.** One `AuditLog` row per column you change, skipping no-ops.
6. **Timestamps.** Through `datetime_utils`.
7. **Errors.** `404` for a missing row, `409` for a conflict (with a message
   that says what to do), `403` for a role gate. Catch `IntegrityError` and
   translate it; never let a constraint name reach the user.
8. **Test.** Add to `source/backend/tests/integration/` following the existing
   fixtures — assert the row *and* the audit trail, and track anything you
   create so the teardown removes it.
9. **Frontend.** Extend the matching `src/lib/<resource>.ts`, never call
   `fetch` directly from a component.
10. **Document.** Update `docs/documentation/api-documentation.md`, and the user
    guide if the UI changed.

## 6. Git workflow

- `main` is the integration branch and is what CI gates. Work on a branch:
  `feat/...`, `fix/...`, `refactor/...`.
- Open a **pull request into `main`**. `Docker-Build-Check` runs on every PR:
  it writes `source/.env` from repository secrets, brings both services up with
  `--wait`, and fails if either healthcheck does not pass within 120s.
- Commit messages in this repo are a short imperative summary of the change,
  with the PR number appended by the merge — for example
  *"Add search functionality to retrieve_tickets endpoint (#98)"*.
- Review expects: what changed, why, and how it was checked. Schema changes get
  called out explicitly, because Supabase is shared — a merged model change
  that nobody applied to the database breaks everyone.

## 7. Code style

- **Python:** standard library → third party → `app.*` imports, in that order;
  type hints on handler signatures and service functions; `Annotated[...,
  Depends(...)]` for dependencies. Comments explain *why* a non-obvious choice
  was made (see the quota gate in `ticket.py` or the pooling notes in
  `database.py`) — match that density rather than narrating the code.
- **TypeScript:** `npm run lint` (`eslint-config-next`) must pass; `@/` is the
  alias for `src/`. Types for API payloads live beside their fetcher in
  `src/lib/`.

## 8. Known gaps

Kept here deliberately, so nobody has to rediscover them:

- **Ticket and task mutation is not ownership-checked.** `PUT`/`DELETE` on
  `/ticket/{id}` and `/task/{id}` verify only that the caller is an active
  account and that the row exists. Listing is role-filtered, but any member who
  knows an id can edit or delete that record.
- **`POST /task/`** does not validate `category_id` and treats `due_date` as
  optional although the column is `NOT NULL`, so both failures surface as a
  500 instead of `404`/`422`. Its single creation audit row also records
  `row_id = "None"`.
- **`PUT /announcement/{id}`** clears `description` when the field is omitted.
- **No migration tooling.** `app/limits.py` refers to
  `migrations/001_length_limits.sql`, which is not in the repository; schema
  changes are applied to Supabase by hand. Either add the directory or drop the
  reference.
- **No frontend tests** and no unit tests — the suite is integration-only and
  needs a live Supabase (see the test documentation).
- **No `LICENSE` file.** Without one the repository is "all rights reserved" by
  default, which matters if this is ever published (Lecture 13, Part 3).
