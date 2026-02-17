import { getSessionPayload } from '@/lib/auth/session-token';
import { apiErrorResponse } from '@/lib/api/error-response';
import { makeDownloadResponse, parseSheetDownloadKind } from '@/lib/sheet/download-route';
import { prepareOrganizerSheetDownload } from '@/lib/sheet/downloads';

export const runtime = 'nodejs';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ sheetId: string; kind: string }> },
): Promise<Response> {
  const session = await getSessionPayload();
  if (!session) {
    return apiErrorResponse({
      status: 401,
      code: 'DOWNLOAD_UNAUTHORIZED',
      message: 'Потрібна авторизація.',
    });
  }

  const { sheetId, kind: rawKind } = await params;
  const kind = parseSheetDownloadKind(rawKind);
  if (!kind) {
    return apiErrorResponse({
      status: 404,
      code: 'DOWNLOAD_INVALID_KIND',
      message: 'Невірний тип файлу.',
    });
  }

  try {
    const prepared = await prepareOrganizerSheetDownload(session.sub, sheetId, kind);
    if (!prepared) {
      return apiErrorResponse({
        status: 404,
        code: 'DOWNLOAD_SHEET_NOT_FOUND',
        message: 'Листок не знайдено.',
      });
    }

    return makeDownloadResponse(
      prepared.bytes,
      prepared.filename,
      prepared.contentType,
      prepared.contentDisposition,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PDF_NOT_AVAILABLE') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_PDF_NOT_AVAILABLE',
          message: 'PDF ще не сформовано для цього листка.',
        });
      }

      if (error.message === 'SHEET_NOT_SIGNED') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_SHEET_NOT_SIGNED',
          message: 'Листок ще не підписано обома сторонами.',
        });
      }

      if (error.message === 'SIGNED_NOT_AVAILABLE') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_SIGNED_NOT_AVAILABLE',
          message: 'Підписаний контейнер ще недоступний.',
        });
      }

      if (error.message === 'DUBIDOC_DOCUMENT_NOT_AVAILABLE') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_PROVIDER_FILE_NOT_AVAILABLE',
          message: 'Файли підписання ще недоступні. Спробуйте трохи пізніше.',
        });
      }
    }

    console.error('[sheets:download] failed', { sheetId, kind, error });
    return apiErrorResponse({
      status: 500,
      code: 'DOWNLOAD_PREPARE_FAILED',
      message: 'Не вдалося підготувати файл для завантаження.',
    });
  }
}
