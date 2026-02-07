import { NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/auth/session-token';
import { createZip } from '@/lib/files/zip';
import { makeDownloadResponse } from '@/lib/sheet/download-route';
import { getSignedSheetsForProtocol, prepareSignedSheetArchiveEntry } from '@/lib/sheet/downloads';

export const runtime = 'nodejs';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ osbbId: string; protocolId: string }> },
): Promise<Response> {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Потрібна авторизація.' }, { status: 401 });
  }

  const { osbbId, protocolId } = await params;
  const signedSheets = await getSignedSheetsForProtocol(session.sub, osbbId, protocolId);

  if (!signedSheets.length) {
    return NextResponse.json(
      { ok: false, message: 'Підписаних листків для цього протоколу ще немає.' },
      { status: 404 },
    );
  }

  const zipEntries: Array<{ name: string; data: Uint8Array }> = [];
  const failedSheetIds: string[] = [];

  for (const sheet of signedSheets) {
    try {
      zipEntries.push(await prepareSignedSheetArchiveEntry(sheet));
    } catch (error) {
      failedSheetIds.push(sheet.id);
      console.error('[sheets:download:zip] failed to load signed container', {
        protocolId,
        sheetId: sheet.id,
        error,
      });
    }
  }

  if (!zipEntries.length) {
    return NextResponse.json(
      { ok: false, message: 'Не вдалося сформувати ZIP: підписані файли недоступні.' },
      { status: 409 },
    );
  }

  if (failedSheetIds.length) {
    const errors = `Не вдалося включити ${failedSheetIds.length} листк(ів):\n${failedSheetIds.map((id) => `- ${id}`).join('\n')}\n`;
    zipEntries.push({
      name: 'errors.txt',
      data: new TextEncoder().encode(errors),
    });
  }

  const zipBytes = createZip(zipEntries);
  return makeDownloadResponse(zipBytes, `signed-sheets-${protocolId}.zip`, 'application/zip');
}
