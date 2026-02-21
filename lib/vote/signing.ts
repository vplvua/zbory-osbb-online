import { prisma } from '@/lib/db/prisma';
import { getDocumentSigningService } from '@/lib/dubidoc/adapter';
import { processDubidocWebhookEvent } from '@/lib/dubidoc/webhook';
import { loadSheetPdfBytesWithFallback } from '@/lib/sheet/pdf-processing';
import type { DocumentStatus } from '@/lib/dubidoc/types';
import type { DocumentParticipantInput } from '@/lib/dubidoc/types';

export const OWNER_EMAIL_REQUIRED_ERROR = 'OWNER_EMAIL_REQUIRED';
export const ORGANIZER_EMAIL_REQUIRED_ERROR = 'ORGANIZER_EMAIL_REQUIRED';
export const SIGNERS_EMAIL_CONFLICT_ERROR = 'SIGNERS_EMAIL_CONFLICT';
const PROTOCOL_DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA');

type SheetSigningContext = {
  id: string;
  dubidocDocumentId: string | null;
  pdfFileUrl: string | null;
  owner: {
    firstName: string;
    middleName: string;
    lastName: string;
    apartmentNumber: string;
    email: string | null;
  };
  protocol: {
    number: string;
    date: Date;
    osbb: {
      shortName: string;
      name: string;
      edrpou: string;
      organizerName: string | null;
      organizerEmail: string | null;
    };
  };
};

type SheetSigningRefreshContext = {
  id: string;
  dubidocDocumentId: string | null;
};

export type SheetSigningRefreshResult = {
  status: DocumentStatus;
  processed: boolean;
  duplicate: boolean;
  ignored: boolean;
};

async function getSheetSigningContext(sheetId: string): Promise<SheetSigningContext | null> {
  return prisma.sheet.findUnique({
    where: { id: sheetId },
    select: {
      id: true,
      dubidocDocumentId: true,
      pdfFileUrl: true,
      owner: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          apartmentNumber: true,
          email: true,
        },
      },
      protocol: {
        select: {
          number: true,
          date: true,
          osbb: {
            select: {
              shortName: true,
              name: true,
              edrpou: true,
              organizerName: true,
              organizerEmail: true,
            },
          },
        },
      },
    },
  });
}

async function getSheetSigningRefreshContext(
  sheetId: string,
): Promise<SheetSigningRefreshContext | null> {
  return prisma.sheet.findUnique({
    where: { id: sheetId },
    select: {
      id: true,
      dubidocDocumentId: true,
    },
  });
}

function normalizeOptionalValue(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function makeNamedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

function buildSheetSigningParticipants(context: SheetSigningContext): DocumentParticipantInput[] {
  const ownerEmail = normalizeOptionalValue(context.owner.email);
  if (!ownerEmail) {
    throw makeNamedError(OWNER_EMAIL_REQUIRED_ERROR);
  }

  const organizerEmail = normalizeOptionalValue(context.protocol.osbb.organizerEmail);
  if (!organizerEmail) {
    throw makeNamedError(ORGANIZER_EMAIL_REQUIRED_ERROR);
  }

  if (ownerEmail.toLowerCase() === organizerEmail.toLowerCase()) {
    throw makeNamedError(SIGNERS_EMAIL_CONFLICT_ERROR);
  }

  const ownerFullName = [context.owner.lastName, context.owner.firstName, context.owner.middleName]
    .filter((part) => part.trim().length > 0)
    .join(' ');

  const organizerFullName =
    normalizeOptionalValue(context.protocol.osbb.organizerName) ?? 'Уповноважена особа';
  const organizerEdrpou = normalizeOptionalValue(context.protocol.osbb.edrpou);

  return [
    {
      role: 'OWNER',
      fullName: ownerFullName || 'Співвласник',
      email: ownerEmail,
    },
    {
      role: 'ORGANIZER',
      fullName: organizerFullName,
      email: organizerEmail,
      edrpou: organizerEdrpou,
    },
  ];
}

function buildSheetDocumentTitle(context: SheetSigningContext): string {
  const protocolNumberRaw = context.protocol.number.trim();
  const protocolNumber = protocolNumberRaw
    ? protocolNumberRaw.startsWith('№')
      ? protocolNumberRaw
      : `№${protocolNumberRaw}`
    : '';
  const protocolDate = PROTOCOL_DATE_FORMATTER.format(context.protocol.date);
  const protocolLabel = protocolNumber
    ? `Протокол ${protocolNumber} від ${protocolDate}`
    : `Протокол від ${protocolDate}`;
  const osbbLabel =
    normalizeOptionalValue(context.protocol.osbb.shortName) ??
    normalizeOptionalValue(context.protocol.osbb.name) ??
    'ОСББ';
  const apartmentLabel = normalizeOptionalValue(context.owner.apartmentNumber) ?? '—';
  const ownerLabel = [context.owner.lastName, context.owner.firstName]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');

  return [osbbLabel, `кв. ${apartmentLabel}`, ownerLabel || 'Співвласник', protocolLabel].join(
    ' • ',
  );
}

export async function ensureSheetSigningRedirectUrl(sheetId: string): Promise<string | null> {
  const context = await getSheetSigningContext(sheetId);
  if (!context) {
    return null;
  }

  const signingService = getDocumentSigningService();
  let documentId = context.dubidocDocumentId;

  if (!documentId) {
    const fileBuffer = await loadSheetPdfBytesWithFallback({
      sheetId: context.id,
      pdfFileUrl: context.pdfFileUrl,
    });
    const participants = buildSheetSigningParticipants(context);
    const title = buildSheetDocumentTitle(context);

    const created = await signingService.createDocumentWithParticipants(
      fileBuffer,
      title,
      participants,
    );
    documentId = created.documentId;

    const saveResult = await prisma.sheet.updateMany({
      where: {
        id: context.id,
        dubidocDocumentId: null,
      },
      data: {
        dubidocDocumentId: documentId,
      },
    });

    if (saveResult.count === 0) {
      const current = await prisma.sheet.findUnique({
        where: { id: context.id },
        select: { dubidocDocumentId: true },
      });
      documentId = current?.dubidocDocumentId ?? documentId;
    }
  }

  const signingLink = await signingService.generateSigningLink(documentId);
  return signingLink.url;
}

function parseIsoDate(value: string | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function refreshSheetSigningStatusFromDubidoc(
  sheetId: string,
): Promise<SheetSigningRefreshResult | null> {
  const context = await getSheetSigningRefreshContext(sheetId);
  if (!context?.dubidocDocumentId) {
    return null;
  }

  const signingService = getDocumentSigningService();
  const checkedAt = new Date();

  try {
    const status = await signingService.getDocumentStatus(context.dubidocDocumentId);

    if (status.status === 'CREATED') {
      return {
        status: status.status,
        processed: false,
        duplicate: false,
        ignored: true,
      };
    }

    if (status.status === 'OWNER_SIGNED') {
      const ownerSignedResult = await processDubidocWebhookEvent({
        eventId: null,
        sourceType: 'MANUAL_STATUS_REFRESH',
        documentId: status.documentId,
        action: 'OWNER_SIGNED',
        occurredAt: parseIsoDate(status.ownerSignedAt),
        participantEmail: null,
      });

      return {
        status: status.status,
        processed: ownerSignedResult.processed,
        duplicate: ownerSignedResult.duplicate,
        ignored: ownerSignedResult.ignored,
      };
    }

    const ownerEventAt = parseIsoDate(status.ownerSignedAt);
    const organizerEventAt = parseIsoDate(status.organizerSignedAt ?? status.ownerSignedAt);

    const ownerSignedResult = await processDubidocWebhookEvent({
      eventId: null,
      sourceType: 'MANUAL_STATUS_REFRESH',
      documentId: status.documentId,
      action: 'OWNER_SIGNED',
      occurredAt: ownerEventAt,
      participantEmail: null,
    });

    const organizerSignedResult = await processDubidocWebhookEvent({
      eventId: null,
      sourceType: 'MANUAL_STATUS_REFRESH',
      documentId: status.documentId,
      action: 'ORGANIZER_SIGNED',
      occurredAt: organizerEventAt,
      participantEmail: null,
    });

    return {
      status: status.status,
      processed: ownerSignedResult.processed || organizerSignedResult.processed,
      duplicate: ownerSignedResult.duplicate && organizerSignedResult.duplicate,
      ignored: ownerSignedResult.ignored && organizerSignedResult.ignored,
    };
  } finally {
    await prisma.sheet
      .updateMany({
        where: { id: context.id },
        data: {
          dubidocLastCheckedAt: checkedAt,
        },
      })
      .catch((error) => {
        console.warn('[vote:signing] failed to persist Dubidoc check timestamp', {
          sheetId: context.id,
          error,
        });
      });
  }
}
