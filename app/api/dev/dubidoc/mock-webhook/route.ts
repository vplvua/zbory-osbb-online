import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isDubidocConfigured } from '@/lib/dubidoc/adapter';
import { parseDubidocWebhookPayload, processDubidocWebhookEvent } from '@/lib/dubidoc/webhook';

const simulateWebhookSchema = z.object({
  documentId: z.string().trim().min(1),
  event: z.enum(['OWNER_SIGNED', 'ORGANIZER_SIGNED']),
  eventId: z.string().trim().min(1).optional(),
  occurredAt: z.string().trim().min(1).optional(),
});

function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function POST(request: Request): Promise<Response> {
  if (!isDevMode()) {
    return NextResponse.json({ ok: false, message: 'Not found.' }, { status: 404 });
  }

  if (isDubidocConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Mock webhook simulation is disabled when real Dubidoc mode is enabled.',
      },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірний JSON payload.' }, { status: 400 });
  }

  const parsedInput = simulateWebhookSchema.safeParse(payload);
  if (!parsedInput.success) {
    return NextResponse.json(
      { ok: false, message: 'Невірні дані для симуляції webhook.' },
      { status: 400 },
    );
  }

  const normalized = parseDubidocWebhookPayload({
    eventId: parsedInput.data.eventId,
    eventType: parsedInput.data.event,
    documentId: parsedInput.data.documentId,
    occurredAt: parsedInput.data.occurredAt,
  });

  if (!normalized.ok) {
    return NextResponse.json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const result = await processDubidocWebhookEvent(normalized.event);

  console.info('[dubidoc:webhook:mock] simulated', {
    documentId: normalized.event.documentId,
    action: normalized.event.action,
    eventId: normalized.event.eventId,
    processed: result.processed,
    duplicate: result.duplicate,
    ignored: result.ignored,
    sheetId: result.sheetId,
    status: result.status,
  });

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    duplicate: result.duplicate,
    ignored: result.ignored,
    message: result.message,
    sheetId: result.sheetId,
    status: result.status,
  });
}
