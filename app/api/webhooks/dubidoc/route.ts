import { NextResponse } from 'next/server';
import {
  parseDubidocWebhookPayload,
  processDubidocWebhookEvent,
  verifyDubidocWebhookRequest,
} from '@/lib/dubidoc/webhook';

export async function POST(request: Request): Promise<Response> {
  const verification = verifyDubidocWebhookRequest(request);
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, message: verification.message },
      { status: verification.status },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірний JSON payload.' }, { status: 400 });
  }

  const parsed = parseDubidocWebhookPayload(payload);
  if (!parsed.ok) {
    console.info('[dubidoc:webhook] ignored invalid payload', { reason: parsed.message });
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  console.info('[dubidoc:webhook] received', {
    documentId: parsed.event.documentId,
    action: parsed.event.action,
    eventType: parsed.event.sourceType,
    eventId: parsed.event.eventId,
  });

  const result = await processDubidocWebhookEvent(parsed.event);

  console.info('[dubidoc:webhook] processed', {
    documentId: parsed.event.documentId,
    action: parsed.event.action,
    eventId: parsed.event.eventId,
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
