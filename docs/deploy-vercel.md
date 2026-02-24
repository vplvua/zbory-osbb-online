# Deploy on Vercel (MVP)

## Checklist

1. Open project `Settings -> Environment Variables`.
2. Add required variables.
3. Connect PostgreSQL in Vercel Storage/Marketplace.
4. Set Build Command with Prisma migrations.
5. Redeploy and verify logs.

## Environment Variables

| Variable                 | Required               | Recommended scope                              | Notes                                                                                     |
| ------------------------ | ---------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes                    | Production + Preview                           | Main runtime DB URL used by Prisma client.                                                |
| `POSTGRES_URL`           | Yes (for migrations)   | Production + Preview                           | Direct DB URL for Prisma migrations (`directUrl`).                                        |
| `NEXTAUTH_SECRET`        | Yes                    | Production (+ Preview if auth is tested there) | Required in production; use a long random secret. Mark as sensitive.                      |
| `NEXTAUTH_URL`           | Yes                    | Production                                     | Public app URL, for example `https://<your-domain>`.                                      |
| `ENCRYPTION_KEY`         | Yes                    | Production + Preview                           | App-level encryption key (32+ chars).                                                     |
| `DUBIDOC_API_KEY`        | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode. |
| `DUBIDOC_ORG_ID`         | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode. |
| `DUBIDOC_CALLBACK_URL`   | Optional               | Production + Preview                           | If empty, fallback is `${NEXTAUTH_URL}/api/webhooks/dubidoc`.                             |
| `DUBIDOC_WEBHOOK_SECRET` | Optional (recommended) | Production + Preview                           | If set, Dubidoc must send `x-dubidoc-webhook-secret`.                                     |
| `TURBOSMS_API_KEY`       | Yes in Production      | Production + Preview                           | Required by production env guardrails. In preview/dev, empty/placeholder keeps mock mode. |
| `TURBOSMS_SENDER`        | Yes in Production      | Production + Preview                           | Required by production env guardrails. Sender must be non-empty and max 32 chars.         |
| `OPENAI_API_KEY`         | Optional               | Production + Preview                           | Stage 2 only.                                                                             |
| `CRON_SECRET`            | Optional (recommended) | Production + Preview                           | Protects `/api/cron/deferred-queue` endpoint.                                             |

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

## Post-Deploy Verification

Check deployment logs for:

- `prisma migrate deploy` completed successfully
- `All migrations have been successfully applied.`
- `next build` completed successfully
