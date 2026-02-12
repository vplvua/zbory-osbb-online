import { promises as fs } from 'node:fs';
import { SheetStatus } from '@prisma/client';
import { getDocumentSigningService, isDubidocConfigured } from '@/lib/dubidoc/adapter';
import { prisma } from '@/lib/db/prisma';

export type SheetDownloadKind = 'original' | 'visualization' | 'signed';

export type PreparedDownload = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
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

async function loadSignedBytes(sheet: SheetDownloadRecord): Promise<Uint8Array> {
  if (sheet.dubidocDocumentId) {
    const signingService = getDocumentSigningService();
    try {
      return await signingService.downloadSigned(sheet.dubidocDocumentId);
    } catch (error) {
      if (isDubidocConfigured()) {
        throw error;
      }

      const pdfBytes = await readPdfBytes(sheet);
      return makeMockP7s(sheet.id, pdfBytes.byteLength);
    }
  }

  if (!isDubidocConfigured()) {
    const pdfBytes = await readPdfBytes(sheet);
    return makeMockP7s(sheet.id, pdfBytes.byteLength);
  }

  throw new Error('SIGNED_NOT_AVAILABLE');
}

async function prepareDownload(
  sheet: SheetDownloadRecord,
  kind: SheetDownloadKind,
): Promise<PreparedDownload> {
  const baseName = getBaseFilename(sheet.id);

  if (kind === 'signed') {
    if (sheet.status !== SheetStatus.SIGNED) {
      throw new Error('SHEET_NOT_SIGNED');
    }

    return {
      bytes: await loadSignedBytes(sheet),
      filename: `${baseName}.p7s`,
      contentType: 'application/pkcs7-signature',
    };
  }

  const pdfBytes = await readPdfBytes(sheet);
  if (kind === 'visualization') {
    // TODO: Replace with a distinct signature visualization PDF once provider rendering is integrated.
    return {
      bytes: pdfBytes,
      filename: `${baseName}-visualization.pdf`,
      contentType: 'application/pdf',
    };
  }

  return {
    bytes: pdfBytes,
    filename: `${baseName}.pdf`,
    contentType: 'application/pdf',
  };
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

  if (sheet.status !== SheetStatus.SIGNED) {
    throw new Error('SHEET_NOT_SIGNED');
  }

  return prepareDownload(sheet, kind);
}
