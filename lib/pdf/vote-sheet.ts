import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';
import type { VoteSheetPdfInput, VoteSheetPdfResult } from '@/lib/pdf/types';
import { retryPresets, withRetry } from '@/lib/retry/withRetry';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN_X = 56.69;
const TOP_CONTENT_Y = PAGE_HEIGHT - 56;
const BOTTOM_CONTENT_Y = 56;

const FONT_SIZE_BODY = 9;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 11;
const LINE_HEIGHT_BODY = 11.5;
const LINE_HEIGHT_SMALL = 10;
const COLONTITULE_FONT_SIZE = 7;

const TABLE_LINE_WIDTH = 0.6;
const TABLE_MIN_ROW_HEIGHT = 26;
const SIGNATURE_BLOCK_HEIGHT = 40;
const SIGNATURE_TOP_GAP = 28;
const TABLE_HEADER_HEIGHT = 34;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_COLONTITULE = rgb(0.42, 0.42, 0.42);

const HEADER_BLOCK_X = PAGE_WIDTH * (2 / 3);
const HEADER_BLOCK_WIDTH = PAGE_WIDTH - HEADER_BLOCK_X - 24;

const BUNDLED_REGULAR_FONT_PATH = path.join(process.cwd(), 'lib/pdf/fonts/DejaVuSans.ttf');
const BUNDLED_BOLD_FONT_PATH = path.join(process.cwd(), 'lib/pdf/fonts/DejaVuSans-Bold.ttf');

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

type EmbeddedFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type RenderContext = {
  pdfDoc: PDFDocument;
  fonts: EmbeddedFonts;
  page: PDFPage;
  cursorY: number;
  createdAtLabel: string;
};

type ParagraphAlign = 'left' | 'center' | 'right';

type ParagraphOptions = {
  font?: PDFFont;
  fontSize?: number;
  lineHeight?: number;
  gapAfter?: number;
  align?: ParagraphAlign;
  maxWidth?: number;
  startX?: number;
};

type TableGeometry = {
  x0: number;
  x1: number;
  x2: number;
  x3: number;
  x4: number;
};

type TableRow = {
  orderNumber: number;
  questionLines: Array<{
    text: string;
    bold: boolean;
  }>;
  voteLines: string[];
  signatureLines: string[];
  height: number;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeOrDash(value: string | null | undefined): string {
  const normalized = normalizeText(value ?? '');
  return normalized || '—';
}

function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value);
}

function formatDateTime(value: Date): string {
  return DATE_TIME_FORMATTER.format(value);
}

function formatDecimal(value: string, fractionDigits: number): string {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return numeric.toFixed(fractionDigits);
}

function formatShareFraction(numerator: number, denominator: number): string {
  if (denominator <= 0 || numerator < 0) {
    return '0/1';
  }

  return `${numerator}/${denominator}`;
}

async function loadBundledFont(fontPath: string, variant: 'regular' | 'bold'): Promise<Uint8Array> {
  try {
    const fontBytes = await fs.readFile(fontPath);
    return new Uint8Array(fontBytes);
  } catch (cause) {
    throw new PermanentError(`[PDF] Bundled ${variant} font file not found: ${fontPath}.`, {
      code: 'PDF_FONT_NOT_FOUND',
      cause,
    });
  }
}

async function loadFonts(pdfDoc: PDFDocument): Promise<EmbeddedFonts> {
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    loadBundledFont(BUNDLED_REGULAR_FONT_PATH, 'regular'),
    loadBundledFont(BUNDLED_BOLD_FONT_PATH, 'bold'),
  ]);

  const regular = await pdfDoc.embedFont(regularFontBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldFontBytes, { subset: true });

  return { regular, bold };
}

function splitByLineWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const normalized = normalizeText(text);
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

    let token = word;
    while (token.length > 0) {
      let part = token;
      while (part.length > 1 && font.widthOfTextAtSize(part, fontSize) > maxWidth) {
        part = part.slice(0, -1);
      }
      lines.push(part);
      token = token.slice(part.length);
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function splitWithFirstLineLimit(
  text: string,
  font: PDFFont,
  fontSize: number,
  firstLineWidth: number,
  followingLineWidth: number,
): string[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [''];
  }

  if (font.widthOfTextAtSize(normalized, fontSize) <= firstLineWidth) {
    return [normalized];
  }

  const words = normalized.split(' ');
  let firstLine = '';
  let splitIndex = 0;

  for (let index = 0; index < words.length; index += 1) {
    const candidate = firstLine ? `${firstLine} ${words[index]}` : words[index];
    if (font.widthOfTextAtSize(candidate, fontSize) <= firstLineWidth) {
      firstLine = candidate;
      splitIndex = index + 1;
      continue;
    }

    break;
  }

  if (!firstLine) {
    const hardSplit = splitByLineWidth(normalized, font, fontSize, firstLineWidth);
    const head = hardSplit[0] ?? '';
    const tail = normalizeText(hardSplit.slice(1).join(' '));
    const remainder = tail ? splitByLineWidth(tail, font, fontSize, followingLineWidth) : [];
    return [head, ...remainder];
  }

  const remainderText = normalizeText(words.slice(splitIndex).join(' '));
  if (!remainderText) {
    return [firstLine];
  }

  return [firstLine, ...splitByLineWidth(remainderText, font, fontSize, followingLineWidth)];
}

function drawLabeledField(
  context: RenderContext,
  label: string,
  value: string,
  options?: {
    suffix?: string;
    gapAfter?: number;
  },
) {
  const suffix = options?.suffix ?? ';';
  const gapAfter = options?.gapAfter ?? 2;
  const lineHeight = LINE_HEIGHT_BODY;
  const fontSize = FONT_SIZE_BODY;
  const normalizedLabel = normalizeText(label);
  const normalizedLabelWithSpace = `${normalizedLabel} `;
  const normalizedValue = `${normalizeText(value) || '—'}${suffix}`;
  const contentWidth = PAGE_WIDTH - MARGIN_X * 2;
  const labelLines = splitByLineWidth(
    normalizedLabel,
    context.fonts.regular,
    fontSize,
    contentWidth,
  );

  if (labelLines.length > 1) {
    const valueLines = splitByLineWidth(
      normalizedValue,
      context.fonts.bold,
      fontSize,
      contentWidth,
    );
    ensureSpace(context, (labelLines.length + valueLines.length) * lineHeight + gapAfter);

    for (const line of labelLines) {
      context.page.drawText(line, {
        x: MARGIN_X,
        y: context.cursorY,
        size: fontSize,
        font: context.fonts.regular,
        color: COLOR_BLACK,
      });
      context.cursorY -= lineHeight;
    }

    for (const line of valueLines) {
      context.page.drawText(line, {
        x: MARGIN_X,
        y: context.cursorY,
        size: fontSize,
        font: context.fonts.bold,
        color: COLOR_BLACK,
      });
      context.cursorY -= lineHeight;
    }

    context.cursorY -= gapAfter;
    return;
  }

  const labelWidth = context.fonts.regular.widthOfTextAtSize(normalizedLabelWithSpace, fontSize);
  const firstLineValueWidth = contentWidth - labelWidth;

  if (firstLineValueWidth < 90) {
    const valueLines = splitByLineWidth(
      normalizedValue,
      context.fonts.bold,
      fontSize,
      contentWidth,
    );
    ensureSpace(context, lineHeight + valueLines.length * lineHeight + gapAfter);

    context.page.drawText(normalizedLabelWithSpace, {
      x: MARGIN_X,
      y: context.cursorY,
      size: fontSize,
      font: context.fonts.regular,
      color: COLOR_BLACK,
    });
    context.cursorY -= lineHeight;

    for (const line of valueLines) {
      context.page.drawText(line, {
        x: MARGIN_X,
        y: context.cursorY,
        size: fontSize,
        font: context.fonts.bold,
        color: COLOR_BLACK,
      });
      context.cursorY -= lineHeight;
    }

    context.cursorY -= gapAfter;
    return;
  }

  const valueLines = splitWithFirstLineLimit(
    normalizedValue,
    context.fonts.bold,
    fontSize,
    firstLineValueWidth,
    contentWidth,
  );

  ensureSpace(context, valueLines.length * lineHeight + gapAfter);

  context.page.drawText(normalizedLabelWithSpace, {
    x: MARGIN_X,
    y: context.cursorY,
    size: fontSize,
    font: context.fonts.regular,
    color: COLOR_BLACK,
  });

  context.page.drawText(valueLines[0], {
    x: MARGIN_X + labelWidth,
    y: context.cursorY,
    size: fontSize,
    font: context.fonts.bold,
    color: COLOR_BLACK,
  });
  context.cursorY -= lineHeight;

  for (const line of valueLines.slice(1)) {
    context.page.drawText(line, {
      x: MARGIN_X,
      y: context.cursorY,
      size: fontSize,
      font: context.fonts.bold,
      color: COLOR_BLACK,
    });
    context.cursorY -= lineHeight;
  }

  context.cursorY -= gapAfter;
}

function drawCenteredLinesInCell(input: {
  page: PDFPage;
  font: PDFFont;
  lines: string[];
  xLeft: number;
  xRight: number;
  yTop: number;
  yBottom: number;
  fontSize: number;
  lineHeight: number;
}) {
  const cellWidth = input.xRight - input.xLeft;
  const cellHeight = input.yTop - input.yBottom;
  const textBlockHeight = (input.lines.length - 1) * input.lineHeight + input.fontSize;
  let y = input.yTop - (cellHeight - textBlockHeight) / 2 - input.fontSize;

  for (const line of input.lines) {
    const lineWidth = input.font.widthOfTextAtSize(line, input.fontSize);
    const x = input.xLeft + (cellWidth - lineWidth) / 2;

    input.page.drawText(line, {
      x,
      y,
      size: input.fontSize,
      font: input.font,
      color: COLOR_BLACK,
    });

    y -= input.lineHeight;
  }
}

function splitOsbbNameLines(
  name: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const normalized = normalizeText(name);
  if (!normalized) {
    return ['—'];
  }

  const words = normalized.split(' ');
  if (words.length <= 4) {
    return splitByLineWidth(normalized, font, fontSize, maxWidth);
  }

  const firstLine = words.slice(0, 2).join(' ');
  const secondLine = words.slice(2, 4).join(' ');
  const remainder = normalizeText(words.slice(4).join(' '));

  const remainderLines = remainder ? splitByLineWidth(remainder, font, fontSize, maxWidth) : [];
  return [firstLine, secondLine, ...remainderLines];
}

function getProtocolMeetingTitle(
  protocolType: VoteSheetPdfInput['protocol']['type'],
): 'Загальних зборів співвласників' | 'Установчих зборів співвласників' {
  return protocolType === 'ESTABLISHMENT'
    ? 'Установчих зборів співвласників'
    : 'Загальних зборів співвласників';
}

function drawPageHeader(context: RenderContext) {
  const label = `Створено: ${context.createdAtLabel}`;

  context.page.drawText(label, {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 24,
    size: COLONTITULE_FONT_SIZE,
    font: context.fonts.regular,
    color: COLOR_COLONTITULE,
  });
}

function addPage(context: RenderContext) {
  context.page = context.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.cursorY = TOP_CONTENT_Y;
  drawPageHeader(context);
}

function ensureSpace(context: RenderContext, requiredHeight: number) {
  if (context.cursorY - requiredHeight < BOTTOM_CONTENT_Y) {
    addPage(context);
  }
}

function drawWrappedParagraph(context: RenderContext, text: string, options?: ParagraphOptions) {
  const font = options?.font ?? context.fonts.regular;
  const fontSize = options?.fontSize ?? FONT_SIZE_BODY;
  const lineHeight = options?.lineHeight ?? LINE_HEIGHT_BODY;
  const gapAfter = options?.gapAfter ?? 0;
  const align = options?.align ?? 'left';
  const startX = options?.startX ?? MARGIN_X;
  const maxWidth = options?.maxWidth ?? PAGE_WIDTH - MARGIN_X * 2;
  const lines = splitByLineWidth(text, font, fontSize, maxWidth);

  ensureSpace(context, lines.length * lineHeight + gapAfter);

  for (const line of lines) {
    let x = startX;

    if (align !== 'left') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);

      if (align === 'center') {
        x = startX + (maxWidth - lineWidth) / 2;
      } else {
        x = startX + maxWidth - lineWidth;
      }
    }

    context.page.drawText(line, {
      x,
      y: context.cursorY,
      size: fontSize,
      font,
      color: COLOR_BLACK,
    });

    context.cursorY -= lineHeight;
  }

  context.cursorY -= gapAfter;
}

function drawMainHeader(context: RenderContext, input: VoteSheetPdfInput) {
  const protocolNumber = normalizeText(input.protocol.number) || '_______';
  const osbbNameLines = splitOsbbNameLines(
    normalizeOrDash(input.osbb.name),
    context.fonts.regular,
    FONT_SIZE_BODY,
    HEADER_BLOCK_WIDTH,
  );

  drawWrappedParagraph(context, `Додаток до протоколу № ${protocolNumber}`, {
    align: 'left',
    startX: HEADER_BLOCK_X,
    maxWidth: HEADER_BLOCK_WIDTH,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
    gapAfter: 2,
  });
  drawWrappedParagraph(context, getProtocolMeetingTitle(input.protocol.type), {
    align: 'left',
    startX: HEADER_BLOCK_X,
    maxWidth: HEADER_BLOCK_WIDTH,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
    gapAfter: 4,
  });

  for (let index = 0; index < osbbNameLines.length; index += 1) {
    drawWrappedParagraph(context, osbbNameLines[index], {
      align: 'left',
      startX: HEADER_BLOCK_X,
      maxWidth: HEADER_BLOCK_WIDTH,
      fontSize: FONT_SIZE_BODY,
      lineHeight: LINE_HEIGHT_SMALL,
      gapAfter: index === osbbNameLines.length - 1 ? 4 : 2,
    });
  }

  drawWrappedParagraph(context, `від ${formatDate(input.protocol.date)} року`, {
    align: 'left',
    startX: HEADER_BLOCK_X,
    maxWidth: HEADER_BLOCK_WIDTH,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
    gapAfter: 20,
  });

  drawWrappedParagraph(context, 'ЛИСТОК ПИСЬМОВОГО ОПИТУВАННЯ СПІВВЛАСНИКА', {
    align: 'center',
    font: context.fonts.bold,
    fontSize: FONT_SIZE_TITLE,
    lineHeight: 14,
    gapAfter: 4,
  });

  drawWrappedParagraph(
    context,
    'Даний лист опитування заповнюється власноручно співвласником квартири або нежитлового приміщення,',
    {
      align: 'center',
      font: context.fonts.bold,
      fontSize: FONT_SIZE_SMALL,
      lineHeight: LINE_HEIGHT_SMALL,
      gapAfter: 1,
    },
  );
  drawWrappedParagraph(context, 'який бере участь у голосуванні.', {
    align: 'center',
    font: context.fonts.bold,
    fontSize: FONT_SIZE_SMALL,
    lineHeight: LINE_HEIGHT_SMALL,
    gapAfter: 14,
  });
}

function drawOwnerDetails(context: RenderContext, input: VoteSheetPdfInput) {
  const ownerName =
    normalizeText(input.owner.fullName ?? '') || normalizeOrDash(input.owner.shortName);
  const apartmentNumber = normalizeText(input.owner.apartmentNumber);
  const address = [
    normalizeText(input.osbb.address),
    apartmentNumber ? `кв. ${apartmentNumber}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const ownershipDocument = normalizeOrDash(input.owner.ownershipDocument);

  const representative = normalizeText(
    [input.owner.representativeName, input.owner.representativeDocument].filter(Boolean).join(', '),
  );

  drawLabeledField(context, '1. Дата опитування:', formatDate(input.surveyDate));
  drawLabeledField(context, "2. Прізвище ім'я по-батькові співвласника:", ownerName);
  drawLabeledField(
    context,
    '3. Документ, що підтверджує право власності на квартиру або нежитлове приміщення:',
    ownershipDocument,
  );
  drawLabeledField(context, '4. Адреса та номер квартири або нежитлового приміщення:', address);
  drawLabeledField(
    context,
    '5. Загальна площа квартири або нежитлового приміщення:',
    formatDecimal(input.owner.totalArea, 2),
  );
  drawLabeledField(
    context,
    '6. Частка власності:',
    `${formatShareFraction(input.owner.ownershipNumerator, input.owner.ownershipDenominator)} (${formatDecimal(input.owner.ownedArea, 2)} м²)`,
  );
  drawLabeledField(
    context,
    '7. У разі необхідності - документ, що надає повноваження на голосуванні від імені співвласника (для представника):',
    representative || '____________________________________',
    { gapAfter: 12 },
  );
}

function getTableGeometry(): TableGeometry {
  const x0 = MARGIN_X;
  const contentWidth = PAGE_WIDTH - MARGIN_X * 2;
  const noWidth = 26;
  const voteWidth = 90;
  const signatureWidth = 80;

  const x1 = x0 + noWidth;
  const x2 = x1 + (contentWidth - noWidth - voteWidth - signatureWidth);
  const x3 = x2 + voteWidth;
  const x4 = x3 + signatureWidth;

  return { x0, x1, x2, x3, x4 };
}

function drawHorizontalLine(page: PDFPage, xFrom: number, xTo: number, y: number) {
  page.drawLine({
    start: { x: xFrom, y },
    end: { x: xTo, y },
    thickness: TABLE_LINE_WIDTH,
    color: COLOR_BLACK,
  });
}

function drawVerticalLine(page: PDFPage, x: number, yFrom: number, yTo: number) {
  page.drawLine({
    start: { x, y: yFrom },
    end: { x, y: yTo },
    thickness: TABLE_LINE_WIDTH,
    color: COLOR_BLACK,
  });
}

function drawTableHeader(context: RenderContext, geometry: TableGeometry) {
  ensureSpace(context, TABLE_HEADER_HEIGHT + TABLE_MIN_ROW_HEIGHT + SIGNATURE_BLOCK_HEIGHT);

  const yTop = context.cursorY;
  const yBottom = yTop - TABLE_HEADER_HEIGHT;

  drawHorizontalLine(context.page, geometry.x0, geometry.x4, yTop);
  drawHorizontalLine(context.page, geometry.x0, geometry.x4, yBottom);

  drawVerticalLine(context.page, geometry.x0, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x1, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x2, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x3, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x4, yTop, yBottom);

  drawCenteredLinesInCell({
    page: context.page,
    font: context.fonts.regular,
    lines: ['№'],
    xLeft: geometry.x0,
    xRight: geometry.x1,
    yTop,
    yBottom,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
  });

  drawCenteredLinesInCell({
    page: context.page,
    font: context.fonts.regular,
    lines: ['Питання порядку денного, пропозиція'],
    xLeft: geometry.x1,
    xRight: geometry.x2,
    yTop,
    yBottom,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
  });

  drawCenteredLinesInCell({
    page: context.page,
    font: context.fonts.regular,
    lines: ['Результат', 'голосування', '(«ЗА» /', '«ПРОТИ»)'],
    xLeft: geometry.x2,
    xRight: geometry.x3,
    yTop,
    yBottom,
    fontSize: 6,
    lineHeight: 7,
  });

  drawCenteredLinesInCell({
    page: context.page,
    font: context.fonts.regular,
    lines: ['Підпис'],
    xLeft: geometry.x3,
    xRight: geometry.x4,
    yTop,
    yBottom,
    fontSize: FONT_SIZE_BODY,
    lineHeight: LINE_HEIGHT_SMALL,
  });

  context.cursorY = yBottom;
}

function buildVoteLines(vote: VoteSheetPdfInput['questions'][number]['vote']): string[] {
  if (vote === 'FOR') {
    return ['ЗА'];
  }

  if (vote === 'AGAINST') {
    return ['ПРОТИ'];
  }

  return [];
}

function buildSignatureLines(vote: VoteSheetPdfInput['questions'][number]['vote']): string[] {
  if (vote === 'FOR' || vote === 'AGAINST') {
    return ['електронний підпис'];
  }

  return [];
}

function buildTableRows(
  input: VoteSheetPdfInput,
  geometry: TableGeometry,
  regularFont: PDFFont,
  boldFont: PDFFont,
): TableRow[] {
  const questionWidth = geometry.x2 - geometry.x1 - 8;
  const voteWidth = geometry.x3 - geometry.x2 - 8;
  const signatureWidth = geometry.x4 - geometry.x3 - 8;

  if (input.questions.length === 0) {
    return [
      {
        orderNumber: 1,
        questionLines: [{ text: '—', bold: false }],
        voteLines: [],
        signatureLines: [],
        height: TABLE_MIN_ROW_HEIGHT,
      },
    ];
  }

  return input.questions.map((question) => {
    const questionText = normalizeText(question.text) || '—';
    const proposalText = normalizeText(question.proposal);

    const questionLines = splitByLineWidth(
      questionText,
      regularFont,
      FONT_SIZE_BODY,
      questionWidth,
    ).map((line) => ({ text: line, bold: false }));

    if (proposalText) {
      questionLines.push({ text: '', bold: false });
      questionLines.push(
        ...splitByLineWidth(
          `Пропозиція: ${proposalText}`,
          boldFont,
          FONT_SIZE_BODY,
          questionWidth - 1,
        ).map((line) => ({ text: line, bold: true })),
      );
    }

    const voteLines = buildVoteLines(question.vote).flatMap((line) =>
      splitByLineWidth(line, regularFont, FONT_SIZE_BODY, voteWidth),
    );
    const signatureLines = buildSignatureLines(question.vote).flatMap((line) =>
      splitByLineWidth(line, regularFont, FONT_SIZE_BODY, signatureWidth),
    );

    const lineCount = Math.max(questionLines.length, voteLines.length, signatureLines.length, 1);
    const height = Math.max(TABLE_MIN_ROW_HEIGHT, lineCount * LINE_HEIGHT_SMALL + 8);

    return {
      orderNumber: question.orderNumber,
      questionLines,
      voteLines,
      signatureLines,
      height,
    };
  });
}

function drawTableRow(context: RenderContext, geometry: TableGeometry, row: TableRow) {
  ensureSpace(context, row.height + SIGNATURE_BLOCK_HEIGHT);

  const yTop = context.cursorY;
  const yBottom = yTop - row.height;

  drawHorizontalLine(context.page, geometry.x0, geometry.x4, yBottom);

  drawVerticalLine(context.page, geometry.x0, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x1, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x2, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x3, yTop, yBottom);
  drawVerticalLine(context.page, geometry.x4, yTop, yBottom);

  context.page.drawText(String(row.orderNumber), {
    x: geometry.x0 + 4,
    y: yTop - 12,
    size: FONT_SIZE_BODY,
    font: context.fonts.regular,
    color: COLOR_BLACK,
  });

  for (let index = 0; index < row.questionLines.length; index += 1) {
    const line = row.questionLines[index];
    context.page.drawText(line.text, {
      x: geometry.x1 + 4,
      y: yTop - 12 - index * LINE_HEIGHT_SMALL,
      size: FONT_SIZE_BODY,
      font: line.bold ? context.fonts.bold : context.fonts.regular,
      color: COLOR_BLACK,
    });
  }

  for (let index = 0; index < row.voteLines.length; index += 1) {
    context.page.drawText(row.voteLines[index], {
      x: geometry.x2 + 4,
      y: yTop - 12 - index * LINE_HEIGHT_SMALL,
      size: FONT_SIZE_BODY,
      font: context.fonts.regular,
      color: COLOR_BLACK,
    });
  }

  for (let index = 0; index < row.signatureLines.length; index += 1) {
    context.page.drawText(row.signatureLines[index], {
      x: geometry.x3 + 4,
      y: yTop - 12 - index * LINE_HEIGHT_SMALL,
      size: FONT_SIZE_BODY,
      font: context.fonts.regular,
      color: COLOR_BLACK,
    });
  }

  context.cursorY = yBottom;
}

function drawTable(context: RenderContext, input: VoteSheetPdfInput) {
  const geometry = getTableGeometry();
  const rows = buildTableRows(input, geometry, context.fonts.regular, context.fonts.bold);

  drawTableHeader(context, geometry);

  for (const row of rows) {
    if (context.cursorY - row.height < BOTTOM_CONTENT_Y + SIGNATURE_BLOCK_HEIGHT) {
      addPage(context);
      drawWrappedParagraph(context, 'ЛИСТОК ПИСЬМОВОГО ОПИТУВАННЯ СПІВВЛАСНИКА (продовження)', {
        align: 'center',
        font: context.fonts.bold,
        fontSize: FONT_SIZE_BODY,
        lineHeight: LINE_HEIGHT_BODY,
        gapAfter: 8,
      });
      drawTableHeader(context, geometry);
    }

    drawTableRow(context, geometry, row);
  }
}

function drawOrganizerSignature(context: RenderContext, organizerName: string) {
  ensureSpace(context, SIGNATURE_BLOCK_HEIGHT);

  context.cursorY -= SIGNATURE_TOP_GAP;

  const normalizedOrganizer = normalizeText(organizerName);
  const organizerLabel = normalizedOrganizer || '______________________';

  drawWrappedParagraph(
    context,
    `Підпис особи, що проводила опитування: _______ / ${organizerLabel} /`,
    {
      gapAfter: 0,
    },
  );
}

function drawPageFooters(pdfDoc: PDFDocument, fonts: EmbeddedFonts) {
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let index = 0; index < total; index += 1) {
    const label = `Сторінка ${index + 1} з ${total}`;
    const width = fonts.regular.widthOfTextAtSize(label, FONT_SIZE_SMALL);

    pages[index].drawText(label, {
      x: (PAGE_WIDTH - width) / 2,
      y: 24,
      size: FONT_SIZE_SMALL,
      font: fonts.regular,
      color: COLOR_BLACK,
    });
  }
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

        const fonts = await loadFonts(pdfDoc);

        pdfDoc.setTitle(`Листок опитування ${input.sheetId}`);
        pdfDoc.setCreator('Збори');
        pdfDoc.setProducer('Збори');
        pdfDoc.setCreationDate(input.generatedAt);
        pdfDoc.setModificationDate(new Date());

        const context: RenderContext = {
          pdfDoc,
          fonts,
          page: pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
          cursorY: TOP_CONTENT_Y,
          createdAtLabel: formatDateTime(input.generatedAt),
        };

        drawPageHeader(context);
        drawMainHeader(context, input);
        drawOwnerDetails(context, input);
        drawTable(context, input);
        drawOrganizerSignature(context, input.organizerName);
        drawPageFooters(pdfDoc, fonts);

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
