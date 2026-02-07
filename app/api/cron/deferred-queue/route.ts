import { NextResponse } from 'next/server';
import { processDueDeferredQueueJobs } from '@/lib/queue/deferred-queue';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized cron request.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const result = await processDueDeferredQueueJobs({ limit });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
