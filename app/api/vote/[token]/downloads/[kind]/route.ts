import { NextResponse } from 'next/server';
import { isValidPublicToken } from '@/lib/tokens';
import { makeDownloadResponse, parseSheetDownloadKind } from '@/lib/sheet/download-route';
import { preparePublicSheetDownload } from '@/lib/sheet/downloads';

export const runtime = 'nodejs';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string; kind: string }> },
): Promise<Response> {
  const { token, kind: rawKind } = await params;
  if (!isValidPublicToken(token)) {
    return NextResponse.json({ ok: false, message: 'Листок не знайдено.' }, { status: 404 });
  }

  const kind = parseSheetDownloadKind(rawKind);
  if (!kind) {
    return NextResponse.json({ ok: false, message: 'Невірний тип файлу.' }, { status: 404 });
  }

  try {
    const prepared = await preparePublicSheetDownload(token, kind);
    if (!prepared) {
      return NextResponse.json({ ok: false, message: 'Листок не знайдено.' }, { status: 404 });
    }

    return makeDownloadResponse(prepared.bytes, prepared.filename, prepared.contentType);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'SHEET_NOT_SIGNED') {
        return NextResponse.json(
          { ok: false, message: 'Завантаження доступне лише після повного підписання листка.' },
          { status: 409 },
        );
      }

      if (error.message === 'PDF_NOT_AVAILABLE') {
        return NextResponse.json({ ok: false, message: 'PDF ще недоступний.' }, { status: 409 });
      }

      if (error.message === 'SIGNED_NOT_AVAILABLE') {
        return NextResponse.json(
          { ok: false, message: 'Підписаний контейнер ще недоступний.' },
          { status: 409 },
        );
      }
    }

    console.error('[vote:download] failed', { token, kind, error });
    return NextResponse.json(
      { ok: false, message: 'Не вдалося підготувати файл для завантаження.' },
      { status: 500 },
    );
  }
}
