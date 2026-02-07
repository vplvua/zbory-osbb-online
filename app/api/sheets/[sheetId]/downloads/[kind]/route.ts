import { NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/auth/session-token';
import { makeDownloadResponse, parseSheetDownloadKind } from '@/lib/sheet/download-route';
import { prepareOrganizerSheetDownload } from '@/lib/sheet/downloads';

export const runtime = 'nodejs';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ sheetId: string; kind: string }> },
): Promise<Response> {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Потрібна авторизація.' }, { status: 401 });
  }

  const { sheetId, kind: rawKind } = await params;
  const kind = parseSheetDownloadKind(rawKind);
  if (!kind) {
    return NextResponse.json({ ok: false, message: 'Невірний тип файлу.' }, { status: 404 });
  }

  try {
    const prepared = await prepareOrganizerSheetDownload(session.sub, sheetId, kind);
    if (!prepared) {
      return NextResponse.json({ ok: false, message: 'Листок не знайдено.' }, { status: 404 });
    }

    return makeDownloadResponse(prepared.bytes, prepared.filename, prepared.contentType);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PDF_NOT_AVAILABLE') {
        return NextResponse.json(
          { ok: false, message: 'PDF ще не сформовано для цього листка.' },
          { status: 409 },
        );
      }

      if (error.message === 'SHEET_NOT_SIGNED') {
        return NextResponse.json(
          { ok: false, message: 'Листок ще не підписано обома сторонами.' },
          { status: 409 },
        );
      }

      if (error.message === 'SIGNED_NOT_AVAILABLE') {
        return NextResponse.json(
          { ok: false, message: 'Підписаний контейнер ще недоступний.' },
          { status: 409 },
        );
      }
    }

    console.error('[sheets:download] failed', { sheetId, kind, error });
    return NextResponse.json(
      { ok: false, message: 'Не вдалося підготувати файл для завантаження.' },
      { status: 500 },
    );
  }
}
