# Local Development

## Prerequisites

- Node.js `v20`
- `pnpm`
- Docker + Docker Compose

## Setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Start PostgreSQL:

```bash
docker compose up -d
docker compose ps
```

Expected: `db` service is `healthy`.

3. Install dependencies and Prisma client:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

4. Start app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Happy Path (Mock Integrations)

1. Keep `.env.local` in mock mode:

- `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` empty/placeholder
- `TURBOSMS_API_KEY` empty/placeholder
- `NEXTAUTH_URL=http://localhost:3000`

2. Login with OTP:

- Open `/login`, request code for `+380XXXXXXXXX`
- Find code in server logs: `[SMS:MOCK] +380... -> 1234`
- Submit code on `/verify`

3. Create entities from UI:

- `/osbb/new` -> create OSBB
- OSBB protocols page -> create protocol with at least 1 question
- `/owners/new` -> create owner(s)
- `/sheets/new` -> create sheet(s)

4. Submit vote for token:

```bash
curl "http://localhost:3000/api/vote/<TOKEN>"

curl -X POST "http://localhost:3000/api/vote/<TOKEN>" \
  -H "content-type: application/json" \
  -d '{
    "answers": [
      { "questionId": "<QUESTION_ID_1>", "vote": "FOR" }
    ],
    "consent": true
  }'
```

Expected: response contains `"ok": true`, sheet status becomes `PENDING_ORGANIZER`.

5. Simulate signing to `SIGNED`:

```bash
docker compose exec db psql -U postgres -d zbory_dev -c \
"UPDATE \"Sheet\" SET \"dubidocDocumentId\"='mock-doc-local-1' WHERE \"publicToken\"='<TOKEN>';"

curl -X POST "http://localhost:3000/api/dev/dubidoc/mock-webhook" \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-local-1","event":"OWNER_SIGNED"}'

curl -X POST "http://localhost:3000/api/dev/dubidoc/mock-webhook" \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-local-1","event":"ORGANIZER_SIGNED"}'
```

Refresh `/vote/<TOKEN>` or `/sheets` and verify `SIGNED`.

6. Download files:

```bash
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/original" -o sheet-original.pdf
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/visualization" -o sheet-visualization.pdf
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/signed" -o sheet-signed.p7s
```

## Troubleshooting

- `db` is not healthy:
  - `docker compose logs -f db`
  - Check whether port `5432` is free
  - Restart: `docker compose down && docker compose up -d`
- Prisma `P1001`:
  - Verify `DATABASE_URL` in `.env.local`
  - Verify DB container is healthy
- OTP fails in dev:
  - Keep `TURBOSMS_API_KEY` empty/placeholder
  - Verify phone format `+380XXXXXXXXX`
- Mock webhook is disabled:
  - Clear `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` in `.env.local`
- Mock webhook cannot find sheet by document:
  - Ensure `Sheet.dubidocDocumentId` matches webhook `documentId`
- Download returns `409`:
  - `original/visualization`: PDF not ready yet
  - `signed`: sheet is not `SIGNED` yet

## Prisma Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

If Prisma build scripts are blocked by `pnpm`, run:

```bash
pnpm approve-builds
```

## Deferred Queue Worker (MVP)

Run due jobs once:

```bash
pnpm worker:deferred-queue
```

Optional limit:

```bash
pnpm worker:deferred-queue -- --limit 50
```

Worker updates `attempts`, `lastError`, and status (`PENDING`, `DONE`, `FAILED`).

## Deferred Queue Cron Endpoint (Local/Preview)

Endpoint:

- `GET /api/cron/deferred-queue`

Auth behavior:

- If `CRON_SECRET` is empty, endpoint is callable without auth (local convenience mode).
- If `CRON_SECRET` is set, send either `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- In production, missing `CRON_SECRET` is treated as misconfiguration and endpoint responds `503`.

Examples:

```bash
curl "http://localhost:3000/api/cron/deferred-queue?limit=20"
```

```bash
curl "http://localhost:3000/api/cron/deferred-queue?limit=20" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## DB Helper

Use shared Prisma singleton in server-only code:

```ts
import { prisma, withTransaction } from '@/lib/db/prisma';
```

This prevents excessive connections during Next.js dev hot reloads.
