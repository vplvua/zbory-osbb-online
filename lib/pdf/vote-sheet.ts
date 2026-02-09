import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';
import type { VoteSheetPdfInput, VoteSheetPdfResult } from '@/lib/pdf/types';
import { retryPresets, withRetry } from '@/lib/retry/withRetry';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN_X = 42;
const PAGE_TOP_Y = A4_HEIGHT - 42;
const PAGE_BOTTOM_Y = 42;
const TEXT_SIZE = 11;
const TITLE_SIZE = 14;
const LINE_HEIGHT = 15;
const PARAGRAPH_GAP = 8;

const DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Kyiv',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Europe/Kyiv',
});

const FONT_CANDIDATE_PATHS = [
  process.env.PDF_FONT_PATH,
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
].filter((value): value is string => Boolean(value));

type DrawingContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  supportsUnicode: boolean;
  createdAtLabel: string;
  cursorY: number;
};

function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value);
}

function formatDateTime(value: Date): string {
  return DATE_TIME_FORMATTER.format(value);
}

function winAnsiSafe(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

function normalizeText(text: string, supportsUnicode: boolean): string {
  return supportsUnicode ? text : winAnsiSafe(text);
}

async function loadFirstAvailableFont(): Promise<Uint8Array | null> {
  for (const fontPath of FONT_CANDIDATE_PATHS) {
    try {
      const fontBytes = await fs.readFile(fontPath);
      return new Uint8Array(fontBytes);
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function splitByLineWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    // Hard-break long tokens when one word exceeds max width.
    let token = word;
    while (token.length > 0) {
      let part = token;
      while (part.length > 1 && font.widthOfTextAtSize(part, fontSize) > maxWidth) {
        part = part.slice(0, -1);
      }
      lines.push(part);
      token = token.slice(part.length);
    }
    currentLine = '';
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawPageHeader(context: DrawingContext) {
  const label = normalizeText(`Створено: ${context.createdAtLabel}`, context.supportsUnicode);
  const headerSize = 9;
  const width = context.font.widthOfTextAtSize(label, headerSize);

  context.page.drawText(label, {
    x: A4_WIDTH - PAGE_MARGIN_X - width,
    y: A4_HEIGHT - 24,
    size: headerSize,
    font: context.font,
  });
}

function appendPage(context: DrawingContext) {
  context.page = context.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  context.cursorY = PAGE_TOP_Y;
  drawPageHeader(context);
}

function ensureVerticalSpace(context: DrawingContext, requiredHeight: number) {
  if (context.cursorY - requiredHeight < PAGE_BOTTOM_Y) {
    appendPage(context);
  }
}

function drawWrappedParagraph(
  context: DrawingContext,
  text: string,
  options?: {
    fontSize?: number;
    indent?: number;
    gapAfter?: number;
    lineHeight?: number;
  },
) {
  const fontSize = options?.fontSize ?? TEXT_SIZE;
  const indent = options?.indent ?? 0;
  const gapAfter = options?.gapAfter ?? PARAGRAPH_GAP;
  const lineHeight = options?.lineHeight ?? LINE_HEIGHT;
  const safeText = normalizeText(text, context.supportsUnicode);
  const maxWidth = A4_WIDTH - PAGE_MARGIN_X * 2 - indent;
  const lines = splitByLineWidth(safeText, context.font, fontSize, maxWidth);

  for (const line of lines) {
    ensureVerticalSpace(context, lineHeight);
    context.page.drawText(line, {
      x: PAGE_MARGIN_X + indent,
      y: context.cursorY,
      size: fontSize,
      font: context.font,
    });
    context.cursorY -= lineHeight;
  }

  context.cursorY -= gapAfter;
}

function toPdfOperationError(operation: 'generate' | 'write', error: unknown) {
  const classified = classifyError(error);
  const operationCode = operation === 'generate' ? 'PDF_GENERATION_FAILED' : 'PDF_WRITE_FAILED';
  const message =
    operation === 'generate'
      ? '[PDF] Failed to generate vote sheet PDF.'
      : '[PDF] Failed to write vote sheet PDF.';

  if (classified instanceof TemporaryError) {
    return new TemporaryError(message, { code: operationCode, cause: classified });
  }

  if (classified instanceof CriticalError) {
    return new CriticalError(message, { code: operationCode, cause: classified });
  }

  return new PermanentError(message, { code: operationCode, cause: classified });
}

export async function generateVoteSheetPdf(input: VoteSheetPdfInput): Promise<VoteSheetPdfResult> {
  try {
    return await withRetry(
      async () => {
        const startedAt = Date.now();
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const customFontBytes = await loadFirstAvailableFont();
        const font = customFontBytes
          ? await pdfDoc.embedFont(customFontBytes, { subset: true })
          : await pdfDoc.embedFont(StandardFonts.Helvetica);
        const supportsUnicode = customFontBytes !== null;

        const context: DrawingContext = {
          pdfDoc,
          page: pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]),
          font,
          supportsUnicode,
          createdAtLabel: formatDateTime(input.generatedAt),
          cursorY: PAGE_TOP_Y,
        };

        drawPageHeader(context);

        drawWrappedParagraph(context, 'ДОДАТОК', { fontSize: TITLE_SIZE, gapAfter: 4 });
        drawWrappedParagraph(context, 'до протоколу загальних зборів співвласників', {
          gapAfter: 2,
        });
        drawWrappedParagraph(context, `ОСББ "${input.osbb.name}"`, { gapAfter: 2 });
        drawWrappedParagraph(
          context,
          `від ${formatDate(input.protocol.date)} № ${input.protocol.number}`,
          { gapAfter: 14 },
        );

        drawWrappedParagraph(context, 'ЛИСТОК ПИСЬМОВОГО ОПИТУВАННЯ СПІВВЛАСНИКА', {
          fontSize: TITLE_SIZE,
          gapAfter: 14,
        });

        drawWrappedParagraph(context, `1. Дата опитування: ${formatDate(input.surveyDate)}`, {
          gapAfter: 4,
        });
        drawWrappedParagraph(
          context,
          `2. Прізвище та ініціали співвласника: ${input.owner.shortName}`,
          {
            gapAfter: 4,
          },
        );
        drawWrappedParagraph(
          context,
          `3. Адреса та номер квартири: ${input.osbb.address}, кв. ${input.owner.apartmentNumber}`,
          { gapAfter: 4 },
        );
        drawWrappedParagraph(context, `4. Загальна площа: ${input.owner.totalArea} м²`, {
          gapAfter: 4,
        });
        drawWrappedParagraph(
          context,
          `5. Документ права власності: ${input.owner.ownershipDocument}`,
          {
            gapAfter: 4,
          },
        );
        drawWrappedParagraph(
          context,
          `6. Частка власності: ${input.owner.ownershipNumerator}/${input.owner.ownershipDenominator} (${input.owner.ownedArea} м²)`,
          { gapAfter: 4 },
        );

        const representative = input.owner.representativeName
          ? `${input.owner.representativeName}${input.owner.representativeDocument ? `, ${input.owner.representativeDocument}` : ''}`
          : 'не вказано';
        drawWrappedParagraph(context, `7. Представник (за наявності): ${representative}`, {
          gapAfter: 12,
        });

        drawWrappedParagraph(context, 'Співвласник надає згоду на обробку персональних даних.', {
          gapAfter: 12,
        });

        drawWrappedParagraph(context, 'Питання порядку денного:', { gapAfter: 6 });
        for (const question of input.questions) {
          const isFor = question.vote === 'FOR';
          const isAgainst = question.vote === 'AGAINST';

          drawWrappedParagraph(context, `${question.orderNumber}. ${question.text}`, {
            gapAfter: 3,
          });
          drawWrappedParagraph(context, `Пропозиція: ${question.proposal}`, {
            indent: 12,
            gapAfter: 3,
          });
          drawWrappedParagraph(
            context,
            `Позначка: [${isFor ? 'x' : ' '}] За   [${isAgainst ? 'x' : ' '}] Проти   Підпис: __________________`,
            { indent: 12, gapAfter: 8 },
          );
        }

        const organizerName = input.organizerName.trim() || '________________';
        drawWrappedParagraph(
          context,
          `Підпис особи, що проводила опитування: _______ / ${organizerName} /`,
          {
            gapAfter: 0,
          },
        );

        const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
        const generationMs = Date.now() - startedAt;
        return { pdfBytes, generationMs };
      },
      {
        ...retryPresets.pdf,
        shouldRetry: (error) => classifyError(error) instanceof TemporaryError,
      },
    );
  } catch (error) {
    throw toPdfOperationError('generate', error);
  }
}

export async function writeVoteSheetPdfToTemp(input: {
  sheetId: string;
  pdfBytes: Uint8Array;
}): Promise<string> {
  try {
    return await withRetry(
      async () => {
        const directory = path.join(tmpdir(), 'zbory-pdfs');
        await fs.mkdir(directory, { recursive: true });
        const filePath = path.join(directory, `sheet-${input.sheetId}.pdf`);
        await fs.writeFile(filePath, input.pdfBytes);
        return filePath;
      },
      {
        ...retryPresets.pdf,
        shouldRetry: (error) => classifyError(error) instanceof TemporaryError,
      },
    );
  } catch (error) {
    throw toPdfOperationError('write', error);
  }
}
