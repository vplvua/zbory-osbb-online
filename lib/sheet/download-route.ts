import type { SheetDownloadKind } from '@/lib/sheet/downloads';

export function parseSheetDownloadKind(value: string): SheetDownloadKind | null {
  if (value === 'original') {
    return 'original';
  }

  if (value === 'visualization') {
    return 'visualization';
  }

  if (value === 'signed') {
    return 'signed';
  }

  return null;
}

export function makeDownloadResponse(
  bytes: Uint8Array,
  filename: string,
  contentType: string,
): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
