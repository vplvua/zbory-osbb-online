import { promises as fs } from 'node:fs';
import { SheetStatus } from '@prisma/client';
import { getDocumentSigningService, isDubidocConfigured } from '@/lib/dubidoc/adapter';
import { prisma } from '@/lib/db/prisma';
import type { DocumentDownloadVariant } from '@/lib/dubidoc/types';

export type SheetDownloadKind = 'original' | 'visualization' | 'signed' | 'printable' | 'protocol';

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
  if (!sheet.pdfFileUrl) {
    throw new Error('PDF_NOT_AVAILABLE');
  }

  return fs.readFile(sheet.pdfFileUrl);
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

  if (variant === 'protocol') {
    return `${baseName}-protocol.pdf`;
  }

  return `${baseName}.pdf`;
}

function getFallbackContentType(variant: DocumentDownloadVariant): string {
  return variant === 'signed' ? 'application/pkcs7-signature' : 'application/pdf';
}

function mapKindToProviderVariant(
  kind: SheetDownloadKind,
  status: SheetStatus,
): DocumentDownloadVariant {
  if (kind === 'visualization') {
    return status === SheetStatus.SIGNED ? 'printable' : 'original';
  }

  if (kind === 'signed' || kind === 'printable' || kind === 'protocol') {
    return kind;
  }

  return 'original';
}

async function loadProviderVariantDownload(
  sheet: SheetDownloadRecord,
  kind: SheetDownloadKind,
): Promise<PreparedDownload> {
  const variant = mapKindToProviderVariant(kind, sheet.status);

  if (!sheet.dubidocDocumentId) {
    // Transitional fallback: legacy records may have only local PDF path and no Dubidoc document id.
    // TODO: Remove local file fallback after one-off backfill to Dubidoc artifacts.
    if (kind === 'original' || kind === 'visualization') {
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
  const downloaded = await signingService.downloadDocumentFile(sheet.dubidocDocumentId, variant);

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
  const baseName = getBaseFilename(sheet.id);

  if (kind === 'signed' || kind === 'printable' || kind === 'protocol') {
    if (sheet.status !== SheetStatus.SIGNED) {
      throw new Error('SHEET_NOT_SIGNED');
    }

    return loadProviderVariantDownload(sheet, kind);
  }

  const prepared = await loadProviderVariantDownload(sheet, kind);
  if (kind === 'visualization' && !prepared.contentDisposition) {
    // Keep compatibility filename when provider did not send content-disposition.
    return {
      ...prepared,
      filename: `${baseName}-visualization.pdf`,
    };
  }

  return prepared;
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
