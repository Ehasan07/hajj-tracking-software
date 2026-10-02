# Hajj Tracking Software

Hajj and Umrah agency management, built as a multi-tenant SaaS. Bangla and English, BDT and SAR.

## What's inside

| Path | Purpose |
|---|---|
| `apps/web` | Next.js app: public website, admin dashboard, auth and API routes |
| `packages/core` | Pure calculation logic: money, amount in words, references, salary, statements |
| `packages/db` | PostgreSQL schema (Drizzle), migrations, row level security, tenant helper |
| `packages/api` | tRPC routers shared by the web app and the mobile apps |
| `packages/i18n` | Bangla and English messages |

## Ground rules

- Money is stored as integers in minor units (paisa / halala). No floats anywhere near a balance.
- Every tenant table is protected by row level security. The app connects as `hajj_app`, which never owns tables.
- The ledger is append-only. Mistakes are corrected with reversing entries.
- Every change to protected tables is written to `audit_log` by a database trigger.

## Local setup

Requirements: Node 22, Docker, Corepack.

```bash
corepack enable
cp .env.example .env          # then fill the secrets (openssl rand -base64 32)
pnpm install
pnpm db:up                    # postgres :5440, redis :6390, storage :9020
pnpm db:migrate
pnpm dev                      # http://localhost:3100
```

## Checks

```bash
pnpm typecheck
pnpm test                     # core, i18n and database (RLS) tests
pnpm --filter @hajj/web build
```

## Deploy

`Dockerfile` builds two targets: `web` (the Next.js standalone server) and `migrate` (runs database migrations). Production runs behind Caddy on the agency's own server.
