# ISP — Labrador.

Full-stack project with a Next.js frontend and a FastAPI backend, both run through Docker Compose in development mode with hot reload.

**Course:** Individual Software Development Process' 2026 \
**Team:** Wassawin the Goat of All Time (W-GOAT) \
**Chosen IRL Challenge:** Project B Lab Workflow & Request Management

## Team members

| Name | Student ID | GitHub |
| --- | --- | --- |
| Kantinan Lertluckpreecha | 6810545476 | [LELOUCH2L](https://github.com/LELOUCH2L)|
| Jedsada Ungsunantwiwat | 6810545522 | [Jadeung123](https://github.com/Jadeung123)|
| Pathadon Aougsk | 6810545808 | [PathadonAougsk](https://github.com/PathadonAougsk) |
| Wassawin Swangjaeng | 6810545905 | [Wassawin Swangjaeng](https://github.com/CYRTRUS)
| Siraphob Phonphakdee | 6810545930 | [vaporform](https://github.com/vaporform)|

## Project status

Currently in Phase iteration 2 (Such as wireframe, various endpoints and etc.) 
Overall a working demo.

## Documents & diagrams

All specs, reports, and diagrams live in [`docs/`](docs):

| File / folder | Contents |
| --- | --- |
| `docs/ISP-SKE-26 3 Wassawin the Goat of All Time (W-GOAT).pdf` | Software Requirement Specification |
| `docs/ISP-SKE26 Iteration Report 1 W-GOAT.pdf` | Iteration Report 1 |
| `docs/use_case_diagram/` | Use case diagram |
| `docs/sequence_diagram/` | Sequence diagrams (SQD-1 … SQD-7) |
| `docs/activity_diagram/` | Activity diagrams (AD-1 … AD-6) |
| `docs/gantt_chart/` | Project Gantt chart |

## Stack

| Service | Description | URL |
| --- | --- | --- |
| `frontend-dev` | Frontend, `npm run dev` | http://localhost:3000 |
| `backend-dev` | FastAPI API, `fastapi dev` | http://localhost:8000 |

API docs are served by FastAPI at http://localhost:8000/docs

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) 20.10+
- Docker Compose v2 (bundled with Docker Desktop; on Linux install the `docker-compose-plugin`)

```bash
docker --version
docker compose version
```

You do **not** need Node.js or Python installed locally — both run inside containers.

## Setup

```bash
git clone https://github.com/PathadonAougsk/ISP.git
cd ISP
```

### Create `.env`

This step is required. The compose file declares `env_file: ".env"` for the backend, and `.env` is gitignored, so a fresh clone won't have it. Compose will refuse to start without the file.

```bash
touch .env
```

Then fill it with whatever the backend expects (database URL, secret key, etc.). Check `backend/app/` for `os.getenv` / settings usage to see which keys are needed.

## Running

```bash
docker compose up -d
```

`-d` runs detached, so the containers stay up after you close the terminal. The first run builds both images and will take a few minutes.

Once it's up:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

### When to rebuild

Both services bind-mount your source code into the container, so editing files on your machine hot-reloads inside the container. No rebuild needed for normal code changes.

Rebuild when you change a `Dockerfile`, `package.json`, or the Python dependencies:

```bash
docker compose up -d --build
```

## Common commands

```bash
# Status of both services
docker compose ps

# Follow logs from everything
docker compose logs -f

# Follow logs from one service
docker compose logs -f backend-dev
docker compose logs -f frontend-dev

# Shell into a container
docker compose exec backend-dev bash
docker compose exec frontend-dev sh

# Install a new npm package (inside the container, so it lands in the right node_modules)
docker compose exec frontend-dev npm install <package>

# Restart one service
docker compose restart backend-dev

# Stop
docker compose stop

# Stop and remove containers + network
docker compose down

# Nuke volumes too (clears the node_modules cache)
docker compose down -v
```

## How the services talk to each other

- **From your browser** (client-side fetches in the frontend): use `http://localhost:8000`.
- **From inside the frontend container** (SSR, API routes, server components): use `http://backend-dev:8000`. Compose puts both containers on the same network and resolves service names as hostnames. `localhost` inside a container means that container, not your machine.

## Troubleshooting

**`env file ./backend/.env not found`** — you skipped the setup step above. Create the file.

**Port 3000 or 8000 already in use** — something else is bound to that port. Stop it, or change the host side of the mapping in `docker-compose.yaml` (the left number in `"3000:3000"`).

**Frontend can't reach the backend** — check whether the call runs in the browser or on the server, and use the matching hostname from the section above.

**`Cannot find module` in the frontend after adding a dependency** — the `/app/node_modules` anonymous volume is masking your host folder. Run the install inside the container, or rebuild with `docker compose up -d --build`.

**Backend not reloading on save** — confirm the file you edited is under `./backend`, which is mounted to `/Backend` in the container. Files outside that path aren't synced.

**Something is deeply stuck** — `docker compose down -v && docker compose up -d --build` gives a clean slate.

## Notes

- Compose v2 is `docker compose` (space). The hyphenated `docker-compose` v1 is end-of-life.
- This compose file is development-only: `npm run dev` and `fastapi dev` are not suitable for production. A production setup would need a separate compose file with built assets and a proper ASGI server config.
- Consider committing a `backend/.env.example` listing the required keys with dummy values so new clones know what to fill in.
