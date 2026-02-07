import { SheetStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const webhookRoleSchema = z.enum(['OWNER', 'ORGANIZER']);

const dubidocWebhookPayloadSchema = z
  .object({
    eventId: z.string().trim().min(1).optional(),
    eventType: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    documentId: z.string().trim().min(1).optional(),
    occurredAt: z.string().trim().min(1).optional(),
    participantRole: webhookRoleSchema.optional(),
    data: z
      .object({
        eventType: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional(),
        documentId: z.string().trim().min(1).optional(),
        occurredAt: z.string().trim().min(1).optional(),
        participantRole: webhookRoleSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type DubidocWebhookPayload = z.infer<typeof dubidocWebhookPayloadSchema>;

export type DubidocWebhookAction = 'OWNER_SIGNED' | 'ORGANIZER_SIGNED';

export type DubidocWebhookEvent = {
  eventId: string | null;
  sourceType: string;
  documentId: string;
  action: DubidocWebhookAction;
  occurredAt: Date;
};

type ParseWebhookResult =
  | {
      ok: true;
      event: DubidocWebhookEvent;
    }
  | {
      ok: false;
      message: string;
    };

export type ProcessWebhookResult = {
  ok: true;
  processed: boolean;
  duplicate: boolean;
  ignored: boolean;
  message: string;
  sheetId: string | null;
  status: SheetStatus | null;
};

export type WebhookVerificationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

function parseOccurredAt(value?: string): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeEventName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

function mapToAction(
  eventName: string,
  participantRole?: 'OWNER' | 'ORGANIZER',
): DubidocWebhookAction | null {
  if (eventName === 'OWNER_SIGNED' || eventName === 'OWNER_SIGNATURE_COMPLETED') {
    return 'OWNER_SIGNED';
  }

  if (eventName === 'ORGANIZER_SIGNED' || eventName === 'ORGANIZER_SIGNATURE_COMPLETED') {
    return 'ORGANIZER_SIGNED';
  }

  if (
    eventName === 'DOCUMENT_SIGNED' ||
    eventName === 'FULLY_SIGNED' ||
    eventName === 'SIGNING_COMPLETED' ||
    eventName === 'COMPLETED'
  ) {
    return 'ORGANIZER_SIGNED';
  }

  if (eventName === 'PARTICIPANT_SIGNED' || eventName === 'SIGNER_SIGNED') {
    if (participantRole === 'OWNER') {
      return 'OWNER_SIGNED';
    }

    if (participantRole === 'ORGANIZER') {
      return 'ORGANIZER_SIGNED';
    }
  }

  return null;
}

export function verifyDubidocWebhookRequest(request: Request): WebhookVerificationResult {
  const sharedSecret = process.env.DUBIDOC_WEBHOOK_SECRET?.trim();
  if (!sharedSecret) {
    return { ok: true };
  }

  const providedSecret = request.headers.get('x-dubidoc-webhook-secret')?.trim();
  if (!providedSecret || providedSecret !== sharedSecret) {
    return { ok: false, status: 401, message: 'Невірний webhook ключ.' };
  }

  // TODO: Replace shared-secret check with official Dubidoc signature verification once docs are available.
  return { ok: true };
}

export function parseDubidocWebhookPayload(payload: unknown): ParseWebhookResult {
  const parsed = dubidocWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: 'Невірний формат webhook payload.' };
  }

  const raw = parsed.data;
  const sourceEventType = raw.eventType ?? raw.type ?? raw.data?.eventType ?? raw.data?.type;
  const documentId = raw.documentId ?? raw.data?.documentId;
  const participantRole = raw.participantRole ?? raw.data?.participantRole;

  if (!sourceEventType || !documentId) {
    return { ok: false, message: 'Webhook payload має містити eventType/type та documentId.' };
  }

  const normalizedName = normalizeEventName(sourceEventType);
  const action = mapToAction(normalizedName, participantRole);
  if (!action) {
    return { ok: false, message: `Непідтримуваний тип webhook події: ${sourceEventType}` };
  }

  return {
    ok: true,
    event: {
      eventId: raw.eventId ?? null,
      sourceType: sourceEventType,
      documentId,
      action,
      occurredAt: parseOccurredAt(raw.occurredAt ?? raw.data?.occurredAt),
    },
  };
}

async function readSheetByDocumentId(documentId: string) {
  return prisma.sheet.findUnique({
    where: {
      dubidocDocumentId: documentId,
    },
    select: {
      id: true,
      status: true,
      ownerSignedAt: true,
      organizerSignedAt: true,
    },
  });
}

async function applyOwnerSigned(event: DubidocWebhookEvent): Promise<ProcessWebhookResult> {
  const sheet = await readSheetByDocumentId(event.documentId);
  if (!sheet) {
    return {
      ok: true,
      processed: false,
      duplicate: false,
      ignored: true,
      message: 'Листок для документа не знайдено.',
      sheetId: null,
      status: null,
    };
  }

  if (sheet.ownerSignedAt || sheet.status === SheetStatus.SIGNED) {
    return {
      ok: true,
      processed: false,
      duplicate: true,
      ignored: false,
      message: 'Дублікат події підпису співвласника.',
      sheetId: sheet.id,
      status: sheet.status,
    };
  }

  if (sheet.status === SheetStatus.EXPIRED) {
    return {
      ok: true,
      processed: false,
      duplicate: false,
      ignored: true,
      message: 'Листок прострочено, подію проігноровано.',
      sheetId: sheet.id,
      status: sheet.status,
    };
  }

  const update = await prisma.sheet.updateMany({
    where: {
      id: sheet.id,
      ownerSignedAt: null,
      status: {
        in: [SheetStatus.DRAFT, SheetStatus.PENDING_ORGANIZER],
      },
    },
    data: {
      ownerSignedAt: event.occurredAt,
      status: SheetStatus.PENDING_ORGANIZER,
    },
  });

  if (update.count === 0) {
    const current = await readSheetByDocumentId(event.documentId);
    return {
      ok: true,
      processed: false,
      duplicate: Boolean(current?.ownerSignedAt),
      ignored: !current?.ownerSignedAt,
      message: current?.ownerSignedAt
        ? 'Дублікат події підпису співвласника.'
        : 'Подію не застосовано через поточний стан листка.',
      sheetId: current?.id ?? sheet.id,
      status: current?.status ?? sheet.status,
    };
  }

  return {
    ok: true,
    processed: true,
    duplicate: false,
    ignored: false,
    message: 'Подію підпису співвласника застосовано.',
    sheetId: sheet.id,
    status: SheetStatus.PENDING_ORGANIZER,
  };
}

async function applyOrganizerSigned(event: DubidocWebhookEvent): Promise<ProcessWebhookResult> {
  const sheet = await readSheetByDocumentId(event.documentId);
  if (!sheet) {
    return {
      ok: true,
      processed: false,
      duplicate: false,
      ignored: true,
      message: 'Листок для документа не знайдено.',
      sheetId: null,
      status: null,
    };
  }

  if (sheet.organizerSignedAt && sheet.status === SheetStatus.SIGNED) {
    return {
      ok: true,
      processed: false,
      duplicate: true,
      ignored: false,
      message: 'Дублікат події підпису відповідальної особи.',
      sheetId: sheet.id,
      status: sheet.status,
    };
  }

  if (sheet.status === SheetStatus.EXPIRED) {
    return {
      ok: true,
      processed: false,
      duplicate: false,
      ignored: true,
      message: 'Листок прострочено, подію проігноровано.',
      sheetId: sheet.id,
      status: sheet.status,
    };
  }

  const update = await prisma.sheet.updateMany({
    where: {
      id: sheet.id,
      organizerSignedAt: null,
      status: {
        in: [SheetStatus.DRAFT, SheetStatus.PENDING_ORGANIZER, SheetStatus.SIGNED],
      },
    },
    data: {
      ownerSignedAt: sheet.ownerSignedAt ?? event.occurredAt,
      organizerSignedAt: event.occurredAt,
      status: SheetStatus.SIGNED,
    },
  });

  if (update.count === 0) {
    const current = await readSheetByDocumentId(event.documentId);
    return {
      ok: true,
      processed: false,
      duplicate: Boolean(current?.organizerSignedAt),
      ignored: !current?.organizerSignedAt,
      message: current?.organizerSignedAt
        ? 'Дублікат події підпису відповідальної особи.'
        : 'Подію не застосовано через поточний стан листка.',
      sheetId: current?.id ?? sheet.id,
      status: current?.status ?? sheet.status,
    };
  }

  return {
    ok: true,
    processed: true,
    duplicate: false,
    ignored: false,
    message: 'Подію підпису відповідальної особи застосовано.',
    sheetId: sheet.id,
    status: SheetStatus.SIGNED,
  };
}

export async function processDubidocWebhookEvent(
  event: DubidocWebhookEvent,
): Promise<ProcessWebhookResult> {
  if (event.action === 'OWNER_SIGNED') {
    return applyOwnerSigned(event);
  }

  return applyOrganizerSigned(event);
}
