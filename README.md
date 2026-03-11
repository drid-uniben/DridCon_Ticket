# DridCon Ticket System

Ticket registration + QR-based check-in system for DridCon.

## Repo structure

- `client/`: Next.js (App Router) frontend (admin, agent, attendee flows)
- `server/`: Express + MongoDB backend API (auth, admin, scanning)

## Prerequisites

- Node.js (recommended: 20+)
- pnpm
- MongoDB (local or hosted)

## Quick start (local dev)

### 1) Backend

```bash
cd server
pnpm install
cp .env.example .env  # if you create one; otherwise create server/.env manually
pnpm dev
```

The backend serves:

- API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api-docs`
- Uploads: `http://localhost:3000/uploads/...`

### 2) Frontend

Run the frontend on a different port than the backend.

```bash
cd client
pnpm install

# Option A (recommended): keep backend on 3000, run frontend on 3001
pnpm dev -- -p 3001

# Option B: run backend on 4000 (set server PORT=4000) and keep frontend on 3000
```

Open the frontend:

- `http://localhost:3001`

## Environment variables

### Backend (server/.env)

Backend environment variables are validated at startup in `server/src/utils/validateEnv.ts`.

Required:

- `NODE_ENV`: `development` | `test` | `production`
- `PORT`: backend port (default: `3000`)
- `MONGODB_URI`: Mongo connection string
- `FRONTEND_URL`: full frontend origin, e.g. `http://localhost:3001`
- `API_URL`: public base URL of the backend, e.g. `http://localhost:3000`
- `LOG_LEVEL`: `error|warn|info|http|verbose|debug|silly`

JWT:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Email (SMTP):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`: supports `Name <email@domain.com>` format

Admin bootstrap (used by `pnpm seed:admin`):

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### Frontend (client/.env.local)

The frontend reads the API base URL from:

- `NEXT_PUBLIC_API_URL` (preferred)
- or `NEXT_PUBLIC_API_BASE`

Example:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Note: Next.js `remotePatterns` for images also relies on `NEXT_PUBLIC_API_URL` to allow loading uploaded images (e.g. QR codes) from the backend.

## Common commands

### Backend

```bash
cd server
pnpm dev        # ts-node + nodemon
pnpm build      # tsc -> dist/
pnpm start          # node dist/index.js
pnpm lint
pnpm lint:fix
pnpm seed:admin
```

### Frontend

```bash
cd client
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## API routes (high level)

Mounted under `/api/v1`:

- `/auth/*`: registration/login/refresh/logout and invite flows
- `/admin/*`: admin dashboard, agents, attendee management
- `/scan/*`: agent QR scanning + check-in endpoints

Swagger UI is exposed at `/api-docs`.

## File uploads

Registration supports uploading a `paymentProof` file (JPEG/PNG, max 3MB). Uploaded files are served from `/uploads`.

## Troubleshooting

- Port conflict: backend defaults to `3000` and Next.js also defaults to `3000`. Run the frontend with `pnpm dev -- -p 3001` or change backend `PORT`.
- CORS issues: ensure `FRONTEND_URL` matches the exact frontend origin (including port) and uses `http(s)://`.
- Swagger mismatch: `/api-docs` renders `server/swagger.yaml`; if endpoints/servers don’t match `/api/v1`, update the spec accordingly.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
