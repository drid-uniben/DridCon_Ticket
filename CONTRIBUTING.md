# Contributing

Thanks for helping improve the DridCon Ticket System.

This repo is a monorepo with:

- `client/` (Next.js frontend)
- `server/` (Express + MongoDB backend)

## Code of Conduct

This project follows the Code of Conduct in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Getting set up

Prerequisites:

- Node.js (recommended 20+)
- MongoDB access (local or hosted)

Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

Note: CI uses `npm ci` (not `npm install`) in both `client/` and `server/`. If you update dependencies, make sure `package-lock.json` is updated and committed.

Create environment files:

- Backend: `server/.env` (see the env var list in [README.md](README.md))
- Frontend: `client/.env.local` (set `NEXT_PUBLIC_API_URL`)

Run locally:

```bash
cd server
npm run dev

cd ../client
npm run dev -- -p 3001
```

## Branching & workflow

- Branch from `dev`.
- Use short, descriptive branch names, e.g. `fix/cors-local-dev`, `feat/admin-agents-list`.
- Keep PRs focused (one feature/fix per PR when possible).

## Contribution flow (GitHub Actions)

This repository includes workflows under `.github/workflows/` that automate parts of the contribution process (issue assignment, project-board status moves, and PR state signals). To avoid fighting the automation, follow the flow below.

### 1) Pick an issue and claim it

Before you start coding:

- Ensure the issue has been added to the GitHub Project named **“DridCon Ticket System”** by maintainers.
- Ensure the issue is in **Status = Unclaimed**.

To claim the issue, comment exactly:

```text
claim
```

Rules:

- The comment must be only `claim` (case-insensitive; whitespace/newlines are ignored).
- If successful, you’ll be assigned to the issue and the project Status will move to **Claimed**.

### 2) If you can’t continue, disclaim the issue

Comment exactly:

```text
disclaim
```

If you are assigned, automation will unassign you and move the project Status back to **Unclaimed**.

### 3) Open a PR and link it to the issue

- Create your branch from `dev`.
- Open a PR targeting `dev`.

Linking matters because other automation (like moving an issue to “In Review”) reads the PR body to find the related issue.

Recommended:

- Add `Closes #<issue-number>` in the PR description.

If you are assigned to the issue, you can also link the PR by commenting on the **issue**:

```text
propose #<pr-number>
```

Examples that work:

```text
propose #123
propose PR #123
```

If successful, automation will:

- Append `Closes #<issue-number>` to the PR body
- Move the issue on the project board to **In Progress**

### 4) Withdraw/unlink a PR (if needed)

If you need to detach a PR from the issue, comment on the **issue**:

```text
withdraw #<pr-number>
```

If successful, automation removes the `Closes #<issue-number>` line and moves the issue back to **Claimed**.

### 5) Signal review state on the PR

On the **pull request**, you can comment:

```text
awaiting-review
```

This will:

- Add the `awaiting-review` label (and remove `awaiting-author` if present)
- Move the linked issue on the project board to **In Review** (requires `Closes #<issue-number>` in the PR body)

If you need changes and want to signal the opposite state, comment:

```text
awaiting-author
```

This will add the `awaiting-author` label (and remove `awaiting-review` if present).

## CI expectations

Two CI workflows run on pull requests to `dev` and `main`:

- Client CI: `npm ci` + `npm run lint` + `npm run build` in `client/`
- Server CI: `npm ci` + `npm run lint` + `npm run build` in `server/`

Before opening a PR, run locally:

```bash
cd client && npm ci && npm run lint && npm run build
cd ../server && npm ci && npm run lint && npm run build
```

## Coding standards

### TypeScript

- Keep types explicit at module boundaries (request payloads, service interfaces).
- Avoid `any` unless you have a strong reason.

### API conventions (server)

- Routes are mounted under `/api/v1` in `server/src/app.ts`.
- Prefer adding new endpoints in the appropriate route group:
  - `server/src/routes/auth.routes.ts`
  - `server/src/routes/admin.routes.ts`
  - `server/src/routes/scan.routes.ts`
- Use existing middleware patterns for auth/rate limiting.

### Frontend conventions (client)

- Keep API calls centralized via `client/lib/api.ts`.
- Use environment variables for API base URLs (`NEXT_PUBLIC_API_URL`).

## Linting

Run linters before opening a PR:

```bash
cd server && npm run lint
cd ../client && npm run lint
```

Auto-fix backend lint where possible:

```bash
cd server && npm run lint:fix
```

## API documentation (Swagger)

Swagger UI is served from `/api-docs` using `server/swagger.yaml`.

If you change endpoints, update `server/swagger.yaml` in the same PR so the docs stay accurate.

## Pull request checklist

- [ ] PR targets `dev`
- [ ] Runs `server` + `client` locally without errors
- [ ] `npm run lint` passes in both `server/` and `client/`
- [ ] `npm run build` passes in both `server/` and `client/`
- [ ] Updated docs (README/Swagger) if behavior or env vars changed
- [ ] Included any migration notes (Mongo schema changes, new env vars)

## Security

- Do not commit secrets (API keys, SMTP creds, JWT secrets).
- If you discover a security issue, avoid opening a public issue with exploit details; share a minimal report with maintainers instead.
