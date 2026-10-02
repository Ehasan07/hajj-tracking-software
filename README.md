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

## Features so far

- Agencies sign up, choose an ID prefix and the businesses they run
- Inquiry log for people who visit or call, with follow-ups and one-click registration
- Pilgrim register with auto IDs (`AM-26-000001`), search by ID, mobile, passport or name
- Passport details read from the MRZ lines; numbers encrypted, scans stored encrypted
- Payments with gap-free receipt numbers, due tracking and overpayment guard
- Printable A5 money receipt in Bangla and English with a QR code anyone can verify
- Receipt voiding with a reason and a reversing ledger entry
- Packages and a bilingual Hajj & Umrah guide

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
pnpm db:seed                  # demo agency for the public website
pnpm dev                      # http://localhost:3100
pnpm --filter @hajj/db seed:demo   # demo office login with sample pilgrims (app must be running)
```

## Checks

```bash
pnpm typecheck
pnpm test                     # core, i18n, database (RLS) and API flow tests
pnpm --filter @hajj/web build
npx playwright test           # browser test of a full office day
```

## Deploy

`Dockerfile` builds two targets: `web` (the Next.js standalone server) and `migrate` (runs database migrations). Production runs behind Caddy on the agency's own server.
