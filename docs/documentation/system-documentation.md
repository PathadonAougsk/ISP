# Labrador — System Documentation

> **Document type:** System documentation (Lecture 13 §3D)
> **Audience:** whoever runs, deploys or debugs the deployment — currently the
> team itself, acting as its own administrators
> **Status:** development deployment via Docker Compose. There is no production
> deployment yet; §8 records what would have to be decided first.

---

## 1. System overview

Labrador is a two-service web application in front of a managed backend:

```
      Browser (lab member)
            │  HTTPS/HTTP :3000
            ▼
┌───────────────────────────┐        ┌──────────────────────────────┐
│  nextjs                   │        │  Supabase (managed, cloud)   │
│  Next.js 16 · React 19    │        │                              │
│  Node 24 · :3000          │        │  ┌────────────────────────┐  │
│                           │ ──────▶│  │ Auth (auth.users)      │  │
│  · route guard (proxy.ts) │  sign  │  │ email + password, JWT  │  │
│  · Supabase JS client     │   in   │  └────────────────────────┘  │
│  · lib/api.ts → bearer    │        │  ┌────────────────────────┐  │
└───────────┬───────────────┘        │  │ Postgres               │  │
            │ REST :8000             │  │ account, ticket, task, │  │
            │ Authorization: Bearer  │  │ category, announcement,│  │
            ▼                        │  │ audit_log,             │  │
┌───────────────────────────┐        │  │ task_assigned_to       │  │
│  fastapi                  │ ──────▶│  └────────────────────────┘  │
│  FastAPI · Python 3.14    │  SQL   │   via the transaction pooler │
│  uvicorn · :8000          │ asyncpg└──────────────────────────────┘
│                           │
│  · token check per request│  ── Supabase Auth admin API (create/delete
│  · role + quota rules     │      user, change email/password)
│  · SQLAlchemy async ORM   │
└───────────────────────────┘
```

**Trust boundary:** the browser only ever holds the Supabase **anon** key and
the signed-in user's access token. The **service key** and the database
connection string stay in the backend container. Both halves read the same
`source/.env` file, which is why the frontend's keys are the `NEXT_PUBLIC_*`
ones and the backend's are not.

### Components

| Component | Technology | Where | Port |
| --- | --- | --- | --- |
| `nextjs` | Next.js 16.3, React 19, Tailwind 4, `@supabase/ssr` | container, image `node:24-alpine` | 3000 |
| `fastapi` | FastAPI, SQLAlchemy 2 async, asyncpg, `supabase-py` | container, image `python:3.14-slim` | 8000 |
| Database | Supabase Postgres | managed cloud | 5432/6543 (pooler) |
| Identity | Supabase Auth | managed cloud | — |

## 2. Requirements

**To run the development deployment:** Docker Engine with the Compose plugin,
Git, and access to a Supabase project (URL, anon key, service key, database
connection string). Roughly 2 GB free disk for the images and 2 GB RAM.

**To run without Docker:** Python 3.13+ with `uv`, Node 20+ with npm.

**Network egress** to `*.supabase.co` over HTTPS and to the Postgres pooler
port is required — nothing works offline, including most of the test suite.

## 3. Configuration

One file, `source/.env`, is read by **both** services (`env_file:` in
`docker-compose.dev.yaml`). It is gitignored and must never be committed.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | backend | Supabase project URL for the server-side client |
| `SUPABASE_KEY` | backend | Service key — token verification and Auth **admin** calls (create/delete user, change email/password) |
| `SUPABASE_DB_URL` | backend | `postgresql+asyncpg://…` connection string, through the **transaction pooler** |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend (browser) | Same project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend (browser) | Anon key — sign-in only |
| `NEXT_PUBLIC_API_URL` | frontend (browser) | Backend base URL; defaults to `http://localhost:8000`, trailing slashes stripped |

Optional, test-only: `SKIP_DB_TESTS`, `TEST_ACCOUNT_ID` (see the test
documentation).

**Fail fast is deliberate.** `app/dependencies.py` raises
`SUPABASE_URL or SUPABASE_KEY is missing from .env`, `app/database.py` raises
`Connection string is missing from .env`, and the frontend's
`lib/supabase/env.ts` throws on a missing public key — all at import time, so a
misconfigured deployment refuses to start instead of failing later per request.

**Secrets handling:** `source/.env` is distributed out of band between team
members. In CI the same file is **written from GitHub repository secrets** at
the start of the job. Rotating a Supabase key means updating both the shared
file and the repository secrets.

## 4. Deployment (development)

```bash
docker compose -f docker-compose.dev.yaml up --build -d --wait
docker compose -f docker-compose.dev.yaml ps          # health
docker compose -f docker-compose.dev.yaml logs -f fastapi
docker compose -f docker-compose.dev.yaml down        # add -v to drop volumes
```

Start order: `nextjs` declares `depends_on: fastapi`, so the API container
starts first (dependency order only — `--wait` is what waits for health).

Both services run their framework's **dev server with hot reload**, with
polling forced (`WATCHPACK_POLLING`, `WATCHFILES_FORCE_POLLING`) because
bind-mounted filesystems do not deliver inotify events reliably.

### Healthchecks

| Service | Probe | Interval / retries |
| --- | --- | --- |
| `fastapi` | `urllib.request.urlopen('http://localhost:8000/health')` | 5s × 10 |
| `nextjs` | `fetch('http://localhost:3000', {redirect:'manual'})`, non-4xx/5xx | 5s × 10, 30s start period |

`GET /db` is the deeper probe: it runs a real Supabase query and answers
`["Ok"]` or `["Not Ok"]`. Use it to tell "API up" from "API up and database
reachable".

### CI

`.github/workflows/Docker-build-check.yml` runs on every PR to `main`:
write `source/.env` from secrets → `docker compose up --build -d --wait
--wait-timeout 120` → on failure dump logs → always `down -v`. It proves the
images build and both services become healthy; it does **not** run the test
suite.

## 5. Database

The schema of record is `source/backend/app/model.py`. `python -m app.database`
runs `Base.metadata.create_all` against `SUPABASE_DB_URL`. There is no
migration tool — changes are applied to the shared Supabase project by hand,
so a schema change has to be announced to the team.

| Table | Notes |
| --- | --- |
| `account` | Mirrors `auth.users` (PK = the Supabase user id, `ON DELETE CASCADE`). Holds username, email, role, quota, active. `CHECK (quota >= 0)` |
| `category` | Unique name, ≤30 chars |
| `ticket` | Status `pending`/`accepted`/`rejected`, `created_by` RESTRICT, index on `due_date` |
| `task` | Status `in_progress`/`completed`, `due_date` NOT NULL, index on `due_date` |
| `task_assigned_to` | Task ↔ account join table, CASCADE both ways, index on `assigned_id` |
| `announcement` | Lab notices, `created_by` RESTRICT |
| `audit_log` | Append-only trail: table, row id, column, old, new, actor, time. `by_whom` SET NULL, indexes on `(from_table,row_id,occurred_at)` and `by_whom` |

**Database-side objects not in the repository.** The Supabase project also
carries at least a length-limit migration (`migrations/001_length_limits.sql`,
referenced by `app/limits.py` and the constraint tests) and the trigger
`trg_ticket_due_date_eod`, which rewrites every ticket `due_date` to the last
microsecond of that day in Bangkok time. Neither is version-controlled here, so
a fresh Supabase project built from `app/model.py` alone will **not** behave
identically. Recovering or recreating the database means recreating these by
hand until they are committed.

**Referential rules that shape operator behaviour:** `created_by` is
`ON DELETE RESTRICT`, so a member who owns records cannot be deleted —
deactivate instead. `category_id` is `ON DELETE RESTRICT`, so a category in use
cannot be removed until its records are moved.

### Connection pooling

Supabase's **transaction pooler** cannot keep prepared statements between
requests, so `app/database.py` sets `statement_cache_size=0`,
`prepared_statement_cache_size=0`, and uuid-suffixed statement names.
Pool: `pool_size=5`, `max_overflow=5`, `pool_pre_ping=True`,
`pool_recycle=1800`. Symptoms of getting this wrong are
`DuplicatePreparedStatementError` or `InvalidSqlStatementNameError` under
concurrency — if they appear in a new engine, that `connect_args` block is
missing.

## 6. Security

- **Keys.** The service key is backend-only and grants Auth admin powers
  (creating and deleting logins, changing passwords). It must never appear in a
  `NEXT_PUBLIC_*` variable, a client bundle, a log line, or a commit.
- **Authentication** is Supabase's; the backend verifies the bearer token on
  **every** request via `get_current_auth_user`. There are no API keys and no
  session cookies on the backend.
- **Authorisation** is enforced in the application layer: `get_current_account`
  (which also turns away deactivated accounts), `require_admin`, and
  `outranks()` for login resets. Row-level filtering for Lab Users is applied
  in the list queries. Note the gap recorded in the developer guide: ticket and
  task mutation by id is not ownership-checked.
- **Lab Owner** can only be granted from the Supabase dashboard, and cannot be
  deactivated or deleted through the API — a deliberate break-glass account.
- **CORS** allows exactly `http://localhost:3000`. A deployed frontend needs
  this list changed in `app/main.py`.
- **Passwords** are never stored by Labrador; Supabase hashes them (bcrypt,
  hence the 72-character cap). "Verify the current password" is implemented as a
  throwaway sign-in that is immediately signed out `local`-scoped, so the
  user's own browser session survives.
- **Audit trail.** Every mutation writes `audit_log` rows, and they survive the
  deletion of both the record and the actor. The log is readable only by admins
  and is not writable through the API.

## 7. Operations

### Monitoring

No monitoring stack is deployed. What exists: container healthchecks, `GET
/health`, `GET /db`, `docker compose logs`, and the Supabase dashboard
(database health, Auth users, logs, usage).

### Backup and recovery

All persistent state lives in Supabase; the containers are stateless and can be
rebuilt from the repository at any time.

| Concern | Where it stands |
| --- | --- |
| Database backups | Supabase's managed backups for the project's plan. **Not yet verified by a restore drill** |
| Auth users | Part of the same Supabase project |
| Config | `source/.env`, held by team members and in GitHub secrets |
| Code and docs | This Git repository |

Recovering the application is `git clone` + `source/.env` + `docker compose
up --build`. Recovering *data* means restoring the Supabase project — and
because `account.id` references `auth.users.id`, the database and Auth have to
be restored to the same point in time or accounts and logins will disagree.

### Routine administration

| Task | How |
| --- | --- |
| Add a member | Settings → Member → create (admin), or `POST /account/admin` |
| Remove a member | Deactivate; delete only once they own no records |
| Grant Lab Owner | Supabase dashboard only |
| Inspect a change | Settings → Log, or `GET /audit-log/?from_table=…&row_id=…` |
| Rotate a Supabase key | Update `source/.env` for every member **and** the GitHub secrets, then restart |

### Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Container exits at once with `SUPABASE_URL or SUPABASE_KEY is missing from .env` | `source/.env` absent or incomplete | Restore the file, recreate the container |
| `Connection string is missing from .env` | `SUPABASE_DB_URL` unset | Same |
| Frontend throws on `NEXT_PUBLIC_SUPABASE_*` | Public keys missing | Same, then rebuild — public vars are read at build/run of the Next process |
| `/health` OK but `/db` `Not Ok` | Supabase unreachable, paused project, or bad connection string | Check the Supabase dashboard and the pooler host |
| 401 on every API call | Token expired, or the frontend points at the wrong backend | Sign in again; check `NEXT_PUBLIC_API_URL` |
| Browser console CORS error | Frontend served from an origin other than `http://localhost:3000` | Add the origin in `app/main.py` |
| `DuplicatePreparedStatementError` | An engine built without the pooler `connect_args` | Copy the block from `app/database.py` |
| 403 "This account is deactivated" for everyone | `active` was cleared in bulk | Reactivate via Settings → Member, or in the dashboard |
| Edits do not show up | Stale frontend cache | Click the current page in the sidebar (clears the cache and reloads) |
| Hot reload stops working | Polling env vars dropped, or the bind mount is broken | Recreate the container |

## 8. Before any production deployment

Open items, recorded so they are not forgotten:

1. **Production images** — the Dockerfiles run dev servers; production needs
   `next build`/`next start` and uvicorn without `--reload`.
2. **CORS and URLs** — the allowed origin and `NEXT_PUBLIC_API_URL` are
   hardcoded to localhost.
3. **TLS and a hostname** — a reverse proxy in front of both services.
4. **Secret management** — something better than a shared `.env` file.
5. **Schema migrations** — a real tool, so the database is not changed by hand.
6. **Backup verification** — one restore drill, documented here.
7. **Monitoring and alerting** — nothing watches the services today.
