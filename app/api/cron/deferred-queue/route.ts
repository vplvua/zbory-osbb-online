import { NextResponse } from 'next/server';
import { processDueDeferredQueueJobs } from '@/lib/queue/deferred-queue';

export const runtime = 'nodejs';

function readCronSecret(): string {
  return process.env.CRON_SECRET?.trim() ?? '';
}

function isProductionRuntime(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  return vercelEnv === 'production' || process.env.NODE_ENV === 'production';
}

function isAuthorized(request: Request, cronSecret: string): boolean {
  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization')?.trim();
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() === cronSecret;
  }

  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return headerSecret === cronSecret;
}

function parseLimit(value: string | null): number {
  if (!value) {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = readCronSecret();
  if (isProductionRuntime() && cronSecret.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Cron endpoint misconfigured: CRON_SECRET is required in production for /api/cron/deferred-queue.',
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized cron request: invalid or missing cron secret.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const result = await processDueDeferredQueueJobs({ limit });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
