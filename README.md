This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Local environment

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

1. `DATABASE_URL` points to your local Postgres instance (default: `localhost:5432`).

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

## SMS adapter (dev)

If `TURBOSMS_API_KEY` is not set, the SMS adapter uses a dev mock that logs codes to the console and returns success. Use:

```ts
import { getSmsAdapter } from '@/lib/sms/adapter';
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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
