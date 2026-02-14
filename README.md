This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Happy Path (local dev, mock integrations)

1. Start local Postgres:

```bash
cp .env.example .env.local
docker compose up -d
docker compose ps
```

Expected: `db` service is `healthy`.

1. Ensure `.env.local` uses mock mode in dev:

- Keep `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` empty or placeholder values (`replace-with-*`).
- Keep `TURBOSMS_API_KEY` empty or placeholder value (`replace-with-*`).
- Keep `NEXTAUTH_URL=http://localhost:3000`.

1. Install dependencies, generate Prisma client, apply migrations:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

1. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

1. Login with OTP (mock SMS):

- Open `/login` and request code for a phone in `+380XXXXXXXXX` format.
- In server logs, find a line like `[SMS:MOCK] +380... -> 1234`.
- Open `/verify` and submit this code.

1. Create base entities in UI:

- OSBB: open `/osbb/new`, create one OSBB.
- Protocol: open the OSBB protocols page and create a protocol with at least 1 question.
- Owners: open `/owners/new` and create one or more owners.
- Sheets: open `/sheets/new`, select the protocol + owner(s), create sheet(s).

1. Open public vote link and submit vote:

- Open `/sheets`, in "Публічне посилання" click `Перейти` (or `Копіювати`) to open `/vote/<TOKEN>`.
- For local happy-path testing, submit via API (current MVP behavior):

```bash
curl "http://localhost:3000/api/vote/<TOKEN>"
```

Use returned `sheet.questions[].id` values in submit request:

```bash
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

1. Simulate signing in mock mode -> `SIGNED`:

Set a mock Dubidoc document ID for this sheet:

```bash
docker compose exec db psql -U postgres -d zbory_dev -c \
"UPDATE \"Sheet\" SET \"dubidocDocumentId\"='mock-doc-local-1' WHERE \"publicToken\"='<TOKEN>';"
```

Simulate webhook events:

```bash
curl -X POST "http://localhost:3000/api/dev/dubidoc/mock-webhook" \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-local-1","event":"OWNER_SIGNED"}'

curl -X POST "http://localhost:3000/api/dev/dubidoc/mock-webhook" \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-local-1","event":"ORGANIZER_SIGNED"}'
```

Refresh `/vote/<TOKEN>` (or `/sheets`) and verify status `SIGNED`.

1. Download files:

- From public page `/vote/<TOKEN>` (after `SIGNED`): original PDF, visualization PDF, `.p7s`.
- Or via API:

```bash
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/original" -o sheet-original.pdf
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/visualization" -o sheet-visualization.pdf
curl -L "http://localhost:3000/api/vote/<TOKEN>/downloads/signed" -o sheet-signed.p7s
```

## Troubleshooting (local)

- `db` is not healthy:
  - Run `docker compose logs -f db`.
  - Check port `5432` is free.
  - Restart with `docker compose down && docker compose up -d`.
- Prisma cannot connect (`P1001`):
  - Confirm `DATABASE_URL` in `.env.local`.
  - Confirm DB container is running and healthy.
- OTP fails in dev:
  - Keep `TURBOSMS_API_KEY` empty/placeholder to force mock SMS mode.
  - Verify phone format is `+380XXXXXXXXX`.
- Mock webhook returns "disabled when real Dubidoc mode is enabled":
  - Clear `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` in `.env.local`.
- Mock webhook says sheet not found for document:
  - Ensure `Sheet.dubidocDocumentId` exactly matches `documentId` in webhook payload.
- Download returns 409:
  - `original/visualization`: PDF is not ready yet.
  - `signed`: sheet is not yet `SIGNED`; send organizer webhook event first.

## Local DB quickstart

1. Copy env template:

```bash
cp .env.example .env.local
```

1. Start the database:

```bash
docker compose up -d
```

1. Check status:

```bash
docker compose ps
```

1. Tail logs:

```bash
docker compose logs -f db
```

1. Stop the database:

```bash
docker compose down
```

1. Reset the database (removes volume/data):

```bash
docker compose down -v
```

## PostgreSQL read-only user for MCP

Use the prepared script to create/update a dedicated read-only DB user.

1. Run script (set a strong password):

```bash
docker compose exec -T db psql -U postgres -d zbory_dev \
  -v ro_user='zbory_ro' \
  -v ro_password='REPLACE_WITH_STRONG_PASSWORD' \
  -v db_name='zbory_dev' \
  -v schema_name='public' \
  -v migrator_role='postgres' \
  -f /dev/stdin < scripts/db/create_readonly_user.sql
```

1. Verify read-only behavior:

```bash
docker compose exec db psql "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev" -c "SELECT now();"
docker compose exec db psql "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev" -c "CREATE TABLE _deny_test(id int);"
```

Expected: first command succeeds, second command fails with `permission denied`.

1. Configure Codex MCP server (`~/.codex/config.toml`):

```toml
[mcp_servers.postgres_ro]
command = "npx"
args = [
  "-y",
  "@modelcontextprotocol/server-postgres",
  "postgresql://zbory_ro:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/zbory_dev?schema=public"
]
```

If your migrations are applied by a role different from `postgres`, pass that role via `-v migrator_role='your_role'`.

## Local environment

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

1. `DATABASE_URL` and `DIRECT_URL` point to your local Postgres instance (default: `localhost:5432`).

## Integrations keys mode (MVP)

MVP uses a single global set of integration credentials from environment variables for the whole app:

- `DUBIDOC_API_KEY`
- `DUBIDOC_ORG_ID`
- `TURBOSMS_API_KEY`
- `TURBOSMS_SENDER`
- `OPENAI_API_KEY` (Stage 2)

Per-user integration keys are intentionally hidden from the settings UI in MVP to avoid confusion.

The prepared UI component is kept for future iterations:

- `app/dashboard/settings/integrations-settings-section.tsx`

Enable it only after a product decision based on user feedback that per-user integrations are needed.

## Prisma quickstart

1. Install dependencies:

```bash
pnpm install
```

1. Generate Prisma client:

```bash
pnpm db:generate
```

Note: if `pnpm` reports ignored build scripts for Prisma, run:

```bash
pnpm approve-builds
```

Then re-run:

```bash
pnpm db:generate
```

1. Create and apply a migration (when schema changes):

```bash
pnpm db:migrate
```

1. Open Prisma Studio:

```bash
pnpm db:studio
```

## DB helper

Use the shared Prisma client singleton in server-only code (API routes, server actions):

```ts
import { prisma, withTransaction } from '@/lib/db/prisma';
```

The singleton prevents excessive connections during Next.js dev hot reloads.

## Deferred queue (MVP minimal)

`DeferredQueue` is used for lightweight deferred/retry jobs without extra infrastructure.

Enqueue helper:

```ts
import { enqueueDeferredJob } from '@/lib/queue/deferred-queue';

await enqueueDeferredJob({
  type: 'NOOP',
  payload: { source: 'manual-test' },
  runAt: new Date(),
});
```

Run worker locally (process due jobs once):

```bash
pnpm worker:deferred-queue
```

Optional limit:

```bash
pnpm worker:deferred-queue -- --limit 50
```

The worker updates:

- `attempts` on every processing try
- `lastError` on failures
- `status` to `PENDING` (retry), `DONE`, or `FAILED`

## Vercel cron approach (minimal)

Use API endpoint as cron trigger:

- `GET /api/cron/deferred-queue`
- optional auth via `CRON_SECRET` (`Authorization: Bearer <secret>` or `x-cron-secret`)
- optional query param `limit` (1..200)

Example `vercel.json` snippet:

```json
{
  "crons": [
    {
      "path": "/api/cron/deferred-queue?limit=50",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

## SMS adapter (dev)

If `TURBOSMS_API_KEY` is not set, the SMS adapter uses a dev mock that logs codes to the console and returns success. Use:

```ts
import { getSmsAdapter } from '@/lib/sms/adapter';
```

## Dubidoc adapter (mock-first)

Use the signing adapter via:

```ts
import { getDocumentSigningService } from '@/lib/dubidoc/adapter';
```

Provider selection:

- Mock provider is used by default (no real HTTP calls).
- Real provider is used only when both `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` are set to non-empty, non-placeholder values.
- Real provider base URL is fixed to `https://api.dubidoc.com.ua` (PRD default).
- Callback URL is taken from `DUBIDOC_CALLBACK_URL` or falls back to `${NEXTAUTH_URL}/api/webhooks/dubidoc`.

To run in mock mode, keep these values empty in `.env.local` (or remove them):

```env
DUBIDOC_API_KEY=
DUBIDOC_ORG_ID=
```

Mock signing simulation:

- `getDocumentStatus()` call 1: `CREATED`
- call 2: `OWNER_SIGNED`
- call 3+: `ORGANIZER_SIGNED`

Webhook endpoint:

- Production webhook URL: `POST /api/webhooks/dubidoc`
- Optional temporary guard: set `DUBIDOC_WEBHOOK_SECRET` and send it in `x-dubidoc-webhook-secret` header.

Mock webhook simulation (dev only):

- URL: `POST /api/dev/dubidoc/mock-webhook`
- Works only when real Dubidoc mode is disabled (mock provider active).

Example:

```bash
curl -X POST http://localhost:3000/api/dev/dubidoc/mock-webhook \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-123","event":"OWNER_SIGNED"}'
```

## SMS login (MVP)

Minimal OTP flow is available at:

```text
/login -> request code
/verify -> submit code
```

In dev, the OTP code is printed in the server logs when the mock adapter is used.

Rate limiting: OTP request/verify endpoints allow up to 3 attempts per 15 minutes per phone.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project is deployed as a standard Next.js app on Vercel.

## Vercel deployment checklist (MVP)

1. Open your Vercel project -> `Settings` -> `Environment Variables`.
2. Add required variables (table below).
3. Connect a Postgres database in Vercel (`Storage` / `Marketplace`).
4. Set Build Command to run Prisma migrations in production.
5. Redeploy and verify logs.

### Environment variables (Vercel)

Set these in `Project -> Settings -> Environment Variables`.

| Variable                 | Required               | Recommended scope                              | Notes                                                                                                     |
| ------------------------ | ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes                    | Production + Preview                           | Main runtime DB URL used by Prisma client.                                                                |
| `POSTGRES_URL`           | Yes (for migrations)   | Production + Preview                           | Direct DB URL for Prisma migrations (`directUrl`).                                                        |
| `NEXTAUTH_SECRET`        | Yes                    | Production (+ Preview if auth is tested there) | Required in production; use a long random secret. Mark as Sensitive.                                      |
| `NEXTAUTH_URL`           | Yes                    | Production                                     | Public app URL, for example `https://zbory-osbb-online.vercel.app`.                                       |
| `ENCRYPTION_KEY`         | Yes                    | Production + Preview                           | App-level encryption key (32+ chars).                                                                     |
| `DUBIDOC_API_KEY`        | Optional               | Production + Preview                           | Required only for real Dubidoc mode. Keep empty/placeholder for mock mode.                                |
| `DUBIDOC_ORG_ID`         | Optional               | Production + Preview                           | Required only for real Dubidoc mode.                                                                      |
| `DUBIDOC_CALLBACK_URL`   | Optional               | Production + Preview                           | If empty, app falls back to `${NEXTAUTH_URL}/api/webhooks/dubidoc`.                                       |
| `DUBIDOC_WEBHOOK_SECRET` | Optional (recommended) | Production + Preview                           | If set, Dubidoc must send `x-dubidoc-webhook-secret`.                                                     |
| `TURBOSMS_API_KEY`       | Optional               | Production + Preview                           | Real TurboSMS adapter is not implemented yet; keep empty/placeholder (`replace-with-*`) to use mock mode. |
| `TURBOSMS_SENDER`        | Optional               | Production + Preview                           | Sender name for TurboSMS when real mode is implemented.                                                   |
| `OPENAI_API_KEY`         | Optional               | Production + Preview                           | Stage 2 only.                                                                                             |
| `CRON_SECRET`            | Optional (recommended) | Production + Preview                           | Protects `/api/cron/deferred-queue` endpoint.                                                             |

Notes:

- For preview deployments, avoid using production-only URLs in `NEXTAUTH_URL`.
- If a secret value was exposed in screenshots/chat, rotate it immediately.

### Database on Vercel

Use Vercel Postgres via Vercel Storage/Marketplace (for this repo, Prisma Postgres is expected).

After DB connection, Vercel usually provides DB variables automatically (`DATABASE_URL`, `POSTGRES_URL`, and provider-specific URLs like `PRISMA_DATABASE_URL`).

Prisma datasource should use:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("POSTGRES_URL")
}
```

### Build command and Prisma migrations

Use this Build Command in Vercel:

```bash
pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build
```

Use this Install Command:

```bash
pnpm install
```

Do not use `prisma migrate dev` in production.

### Dubidoc webhook setup (HTTPS required)

Set Dubidoc callback URL to:

```text
https://<your-domain>/api/webhooks/dubidoc
```

Requirements:

- HTTPS only (no plain HTTP in production).
- URL must be publicly reachable from Dubidoc.
- If `DUBIDOC_WEBHOOK_SECRET` is set, Dubidoc should send `x-dubidoc-webhook-secret` with matching value.

Dev-only webhook simulator route:

- `POST /api/dev/dubidoc/mock-webhook`
- blocked in production (returns `404`)

### Post-deploy verification

Check latest deployment logs:

- `prisma migrate deploy` ran successfully.
- `All migrations have been successfully applied.`
- `next build` completed successfully.
