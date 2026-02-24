# Deploy on Vercel (MVP)

## Checklist

1. Open project `Settings -> Environment Variables`.
2. Add required variables.
3. Connect PostgreSQL in Vercel Storage/Marketplace.
4. Set Build Command with Prisma migrations.
5. Redeploy and verify logs.

## Environment Variables

| Variable                 | Required               | Recommended scope                              | Notes                                                                                                                  |
| ------------------------ | ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes                    | Production + Preview                           | Main runtime DB URL used by Prisma client.                                                                             |
| `POSTGRES_URL`           | Yes (for migrations)   | Production + Preview                           | Direct DB URL for Prisma migrations (`directUrl`).                                                                     |
| `NEXTAUTH_SECRET`        | Yes                    | Production (+ Preview if auth is tested there) | Required in production; use a long random secret. Mark as sensitive.                                                   |
| `NEXTAUTH_URL`           | Yes                    | Production                                     | Public app URL, for example `https://<your-domain>`.                                                                   |
| `ENCRYPTION_KEY`         | Yes                    | Production + Preview                           | App-level encryption key (32+ chars).                                                                                  |
| `DUBIDOC_API_KEY`        | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode.                              |
| `DUBIDOC_ORG_ID`         | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode.                              |
| `DUBIDOC_CALLBACK_URL`   | Optional               | Production + Preview                           | If empty, fallback is `${NEXTAUTH_URL}/api/webhooks/dubidoc`.                                                          |
| `DUBIDOC_WEBHOOK_SECRET` | Optional (recommended) | Production + Preview                           | If set, Dubidoc must send `x-dubidoc-webhook-secret`.                                                                  |
| `TURBOSMS_API_KEY`       | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode.                              |
| `TURBOSMS_SENDER`        | Yes in Production      | Production + Preview                           | Required by production env guardrails. Sender must be non-empty and max 32 chars.                                      |
| `OPENAI_API_KEY`         | Optional               | Production + Preview                           | Stage 2 only.                                                                                                          |
| `CRON_SECRET`            | Yes in Production      | Production + Preview                           | Protects `/api/cron/deferred-queue` endpoint. If missing in production, endpoint returns `503` misconfiguration error. |

Notes:

- For preview deployments, avoid production-only URLs in `NEXTAUTH_URL`.
- Rotate secrets immediately if exposed in logs/screenshots/chats.

## Database Configuration

Prisma datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("POSTGRES_URL")
}
```

## Build / Install Commands

Build command:

```bash
pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build
```

Install command:

```bash
pnpm install
```

Do not use `prisma migrate dev` in production.

## Dubidoc Webhook Setup

Set callback URL in Dubidoc:

```text
https://<your-domain>/api/webhooks/dubidoc
```

Requirements:

- HTTPS only.
- URL must be publicly reachable by Dubidoc.
- If `DUBIDOC_WEBHOOK_SECRET` is set, Dubidoc sends matching `x-dubidoc-webhook-secret` header.

Dev-only simulator endpoint:

- `POST /api/dev/dubidoc/mock-webhook`
- Disabled in production (`404`)

## Deferred Queue Cron (Production Ops)

Vercel cron schedule is defined in [`vercel.json`](../vercel.json):

- Path: `/api/cron/deferred-queue`
- Schedule: `*/5 * * * *` (every 5 minutes)

Trigger/auth contract:

- Method: `GET`
- Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel sends this automatically when `CRON_SECRET` is configured)
- Alternative auth header (manual): `x-cron-secret: <CRON_SECRET>`

Queue processing limits:

- Default per run: `20` jobs
- Override for manual runs: `?limit=<N>` where `N` is clamped to `1..200`

Expected responses:

- `200`:

```json
{
  "ok": true,
  "scanned": 20,
  "processed": 20,
  "succeeded": 18,
  "retried": 2,
  "failed": 0,
  "skipped": 0
}
```

- `401`: invalid/missing cron secret
- `503`: `CRON_SECRET` missing in production (misconfiguration)

Manual invocation:

```bash
curl "https://<your-domain>/api/cron/deferred-queue?limit=50" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Runbook for failed cron runs:

1. Check Vercel Function logs for `/api/cron/deferred-queue` and note status code/error.
2. If `503`: set `CRON_SECRET` in Vercel env (`Production`, and `Preview` if used), then redeploy.
3. If `401`: verify cron job auth and `CRON_SECRET` value match current deployment env.
4. Re-run endpoint manually (`limit=50` or lower) until due backlog starts decreasing.
5. Verify backlog in DB:

```sql
SELECT COUNT(*) AS pending_due
FROM "DeferredQueue"
WHERE status = 'PENDING' AND "runAt" <= NOW();
```

If `pending_due` does not decrease after retries, inspect `lastError` values and fix the underlying integration/runtime issue before retrying again.

## Post-Deploy Verification

Check deployment logs for:

- `prisma migrate deploy` completed successfully
- `All migrations have been successfully applied.`
- `next build` completed successfully
