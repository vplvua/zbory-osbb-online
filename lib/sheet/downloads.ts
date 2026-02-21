import { SheetStatus } from '@prisma/client';
import { getDocumentSigningService, isDubidocConfigured } from '@/lib/dubidoc/adapter';
import { prisma } from '@/lib/db/prisma';
import { classifyError } from '@/lib/errors';
import type { DocumentDownloadResult, DocumentDownloadVariant } from '@/lib/dubidoc/types';
import { loadSheetPdfBytesWithFallback } from '@/lib/sheet/pdf-processing';

export type SheetDownloadKind = 'original' | 'signed' | 'printable';

export type PreparedDownload = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  contentDisposition: string | null;
};

type SheetDownloadRecord = {
  id: string;
  status: SheetStatus;
  pdfFileUrl: string | null;
  dubidocDocumentId: string | null;
};

function isProviderFilePending(code: string | undefined): boolean {
  if (!code) {
    return false;
  }

  return (
    code === 'DUBIDOC_MOCK_NOT_SIGNED' ||
    code === 'DUBIDOC_HTTP_404' ||
    code === 'DUBIDOC_HTTP_409' ||
    code === 'DUBIDOC_HTTP_422'
  );
}

function makeMockP7s(sheetId: string, sourcePdfSize: number): Uint8Array {
  const text = [
    '-----BEGIN PKCS7-----',
    `sheet-id:${sheetId}`,
    `source-pdf-bytes:${sourcePdfSize}`,
    '-----END PKCS7-----',
  ].join('\n');

  return new TextEncoder().encode(text);
}

async function readPdfBytes(sheet: SheetDownloadRecord): Promise<Uint8Array> {
  return loadSheetPdfBytesWithFallback({
    sheetId: sheet.id,
    pdfFileUrl: sheet.pdfFileUrl,
  });
}

function getBaseFilename(sheetId: string): string {
  return `sheet-${sheetId}`;
}

function getFallbackFilename(sheetId: string, variant: DocumentDownloadVariant): string {
  const baseName = getBaseFilename(sheetId);
  if (variant === 'signed') {
    return `${baseName}.p7s`;
  }

  if (variant === 'printable') {
    return `${baseName}-printable.pdf`;
  }

  return `${baseName}.pdf`;
}

function getFallbackContentType(variant: DocumentDownloadVariant): string {
  return variant === 'signed' ? 'application/pkcs7-signature' : 'application/pdf';
}

function mapKindToProviderVariant(kind: SheetDownloadKind): DocumentDownloadVariant {
  if (kind === 'printable') {
    // Dubidoc returns the signature protocol page in `file=protocol`.
    return 'protocol';
  }

  return kind;
}

async function loadProviderVariantDownload(
  sheet: SheetDownloadRecord,
  kind: SheetDownloadKind,
): Promise<PreparedDownload> {
  const variant = mapKindToProviderVariant(kind);

  if (!sheet.dubidocDocumentId) {
    // Transitional fallback: legacy records may have only local PDF path and no Dubidoc document id.
    // TODO: Remove local file fallback after one-off backfill to Dubidoc artifacts.
    if (kind === 'original') {
      const pdfBytes = await readPdfBytes(sheet);
      return {
        bytes: pdfBytes,
        filename: getFallbackFilename(sheet.id, 'original'),
        contentType: getFallbackContentType('original'),
        contentDisposition: null,
      };
    }

    if (!isDubidocConfigured()) {
      if (variant === 'signed') {
        const pdfBytes = await readPdfBytes(sheet);
        return {
          bytes: makeMockP7s(sheet.id, pdfBytes.byteLength),
          filename: getFallbackFilename(sheet.id, variant),
          contentType: getFallbackContentType(variant),
          contentDisposition: null,
        };
      }

      const pdfBytes = await readPdfBytes(sheet);
      return {
        bytes: pdfBytes,
        filename: getFallbackFilename(sheet.id, variant),
        contentType: getFallbackContentType(variant),
        contentDisposition: null,
      };
    }

    throw new Error('DUBIDOC_DOCUMENT_NOT_AVAILABLE');
  }

  const signingService = getDocumentSigningService();
  let downloaded: DocumentDownloadResult;
  try {
    downloaded = await signingService.downloadDocumentFile(sheet.dubidocDocumentId, variant);
  } catch (error) {
    const classified = classifyError(error);
    if (isProviderFilePending(classified.code)) {
      throw new Error('DUBIDOC_DOCUMENT_NOT_AVAILABLE');
    }

    throw error;
  }

  return {
    bytes: downloaded.bytes,
    filename: downloaded.filename ?? getFallbackFilename(sheet.id, variant),
    contentType: downloaded.contentType || getFallbackContentType(variant),
    contentDisposition: downloaded.contentDisposition,
  };
}

async function prepareDownload(
  sheet: SheetDownloadRecord,
  kind: SheetDownloadKind,
): Promise<PreparedDownload> {
  if (kind === 'signed' || kind === 'printable') {
    if (!sheet.dubidocDocumentId && sheet.status !== SheetStatus.SIGNED) {
      throw new Error('SHEET_NOT_SIGNED');
    }

    return loadProviderVariantDownload(sheet, kind);
  }

  return loadProviderVariantDownload(sheet, kind);
}

export async function getOrganizerSheetForDownload(
  userId: string,
  sheetId: string,
): Promise<SheetDownloadRecord | null> {
  return prisma.sheet.findFirst({
    where: {
      id: sheetId,
      protocol: {
        osbb: {
          userId,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      status: true,
      pdfFileUrl: true,
      dubidocDocumentId: true,
    },
  });
}

export async function getPublicSheetForDownload(
  token: string,
): Promise<(SheetDownloadRecord & { publicToken: string }) | null> {
  return prisma.sheet.findUnique({
    where: {
      publicToken: token,
    },
    select: {
      id: true,
      publicToken: true,
      status: true,
      pdfFileUrl: true,
      dubidocDocumentId: true,
    },
  });
}

export async function prepareOrganizerSheetDownload(
  userId: string,
  sheetId: string,
  kind: SheetDownloadKind,
): Promise<PreparedDownload | null> {
  const sheet = await getOrganizerSheetForDownload(userId, sheetId);
  if (!sheet) {
    return null;
  }

  return prepareDownload(sheet, kind);
}

export async function preparePublicSheetDownload(
  token: string,
  kind: SheetDownloadKind,
): Promise<PreparedDownload | null> {
  const sheet = await getPublicSheetForDownload(token);
  if (!sheet) {
    return null;
  }

  if (sheet.status === SheetStatus.DRAFT || sheet.status === SheetStatus.EXPIRED) {
    throw new Error('SHEET_NOT_READY_FOR_DOWNLOAD');
  }

  return prepareDownload(sheet, kind);
}
