import { SheetStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

const webhookRoleSchema = z.enum(['OWNER', 'ORGANIZER']);
const signaturePayloadSchema = z
  .object({
    signedAt: z.string().trim().min(1).optional(),
    email: z.string().trim().optional().nullable(),
  })
  .passthrough();

const dubidocWebhookPayloadSchema = z
  .object({
    eventId: z.string().trim().min(1).optional(),
    eventType: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1).optional(),
    documentId: z.string().trim().min(1).optional(),
    occurredAt: z.string().trim().min(1).optional(),
    participantRole: webhookRoleSchema.optional(),
    payload: signaturePayloadSchema.optional(),
    data: z
      .object({
        eventType: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional(),
        action: z.string().trim().min(1).optional(),
        documentId: z.string().trim().min(1).optional(),
        occurredAt: z.string().trim().min(1).optional(),
        participantRole: webhookRoleSchema.optional(),
        payload: signaturePayloadSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type DubidocWebhookPayload = z.infer<typeof dubidocWebhookPayloadSchema>;

export type DubidocWebhookAction = 'OWNER_SIGNED' | 'ORGANIZER_SIGNED' | 'SIGNATURE';

export type DubidocWebhookEvent = {
  eventId: string | null;
  sourceType: string;
  documentId: string;
  action: DubidocWebhookAction;
  occurredAt: Date;
  participantEmail: string | null;
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

  if (eventName === 'SIGNATURE') {
    return 'SIGNATURE';
  }

  return null;
}

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
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
  const sourceEventType =
    raw.eventType ??
    raw.type ??
    raw.action ??
    raw.data?.eventType ??
    raw.data?.type ??
    raw.data?.action;
  const documentId = raw.documentId ?? raw.data?.documentId;
  const participantRole = raw.participantRole ?? raw.data?.participantRole;
  const participantEmail = normalizeEmail(raw.payload?.email ?? raw.data?.payload?.email);

  if (!sourceEventType || !documentId) {
    return {
      ok: false,
      message: 'Webhook payload має містити eventType/type/action та documentId.',
    };
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
      occurredAt: parseOccurredAt(
        raw.occurredAt ??
          raw.data?.occurredAt ??
          raw.payload?.signedAt ??
          raw.data?.payload?.signedAt,
      ),
      participantEmail,
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
      owner: {
        select: {
          email: true,
        },
      },
      protocol: {
        select: {
          osbb: {
            select: {
              organizerEmail: true,
            },
          },
        },
      },
    },
  });
}

function inferSignatureAction(
  sheet: NonNullable<Awaited<ReturnType<typeof readSheetByDocumentId>>>,
  event: DubidocWebhookEvent,
): 'OWNER_SIGNED' | 'ORGANIZER_SIGNED' {
  const ownerEmail = normalizeEmail(sheet.owner.email);
  const organizerEmail = normalizeEmail(sheet.protocol.osbb.organizerEmail);
  const participantEmail = normalizeEmail(event.participantEmail);

  if (participantEmail && ownerEmail && participantEmail === ownerEmail) {
    return 'OWNER_SIGNED';
  }

  if (participantEmail && organizerEmail && participantEmail === organizerEmail) {
    return 'ORGANIZER_SIGNED';
  }

  if (!sheet.ownerSignedAt) {
    return 'OWNER_SIGNED';
  }

  if (!sheet.organizerSignedAt) {
    return 'ORGANIZER_SIGNED';
  }

  return 'ORGANIZER_SIGNED';
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
      dubidocSignPending: false,
      dubidocLastError: null,
      dubidocLastCheckedAt: event.occurredAt,
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
      dubidocSignPending: false,
      dubidocLastError: null,
      dubidocLastCheckedAt: event.occurredAt,
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

  if (event.action === 'ORGANIZER_SIGNED') {
    return applyOrganizerSigned(event);
  }

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

  const inferredAction = inferSignatureAction(sheet, event);
  if (inferredAction === 'OWNER_SIGNED') {
    return applyOwnerSigned({ ...event, action: 'OWNER_SIGNED' });
  }

  return applyOrganizerSigned({ ...event, action: 'ORGANIZER_SIGNED' });
}
