import type { SheetDownloadKind } from '@/lib/sheet/downloads';

export function parseSheetDownloadKind(value: string): SheetDownloadKind | null {
  if (value === 'original') {
    return 'original';
  }

  if (value === 'signed') {
    return 'signed';
  }

  if (value === 'printable') {
    return 'printable';
  }

  return null;
}

export function makeDownloadResponse(
  bytes: Uint8Array,
  filename: string,
  contentType: string,
  contentDisposition?: string | null,
): Response {
  const resolvedDisposition =
    contentDisposition && contentDisposition.trim().length > 0
      ? contentDisposition
      : `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': resolvedDisposition,
      'Cache-Control': 'no-store',
    },
  });
}
