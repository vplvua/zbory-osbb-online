import { apiErrorResponse } from '@/lib/api/error-response';
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
    return apiErrorResponse({
      status: 404,
      code: 'DOWNLOAD_SHEET_NOT_FOUND',
      message: 'Листок не знайдено.',
    });
  }

  const kind = parseSheetDownloadKind(rawKind);
  if (!kind) {
    return apiErrorResponse({
      status: 404,
      code: 'DOWNLOAD_INVALID_KIND',
      message: 'Невірний тип файлу.',
    });
  }

  try {
    const prepared = await preparePublicSheetDownload(token, kind);
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
      if (error.message === 'SHEET_NOT_SIGNED') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_SHEET_NOT_SIGNED',
          message: 'Завантаження доступне лише після повного підписання листка.',
        });
      }

      if (error.message === 'SHEET_NOT_READY_FOR_DOWNLOAD') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_SHEET_NOT_READY',
          message: 'Завантаження стане доступним після прийняття голосу.',
        });
      }

      if (error.message === 'PDF_NOT_AVAILABLE') {
        return apiErrorResponse({
          status: 409,
          code: 'DOWNLOAD_PDF_NOT_AVAILABLE',
          message: 'PDF ще недоступний.',
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

    console.error('[vote:download] failed', { token, kind, error });
    return apiErrorResponse({
      status: 500,
      code: 'DOWNLOAD_PREPARE_FAILED',
      message: 'Не вдалося підготувати файл для завантаження.',
    });
  }
}
