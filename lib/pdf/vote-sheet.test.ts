import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { generateVoteSheetPdf } from '@/lib/pdf/vote-sheet';

describe('vote sheet pdf generator', () => {
  it('generates a structurally valid pdf within performance target', async () => {
    const result = await generateVoteSheetPdf({
      sheetId: 'sheet-test-1',
      generatedAt: new Date('2026-02-07T12:00:00.000Z'),
      surveyDate: new Date('2026-02-07T12:00:00.000Z'),
      protocol: {
        number: '12',
        date: new Date('2026-02-01T10:00:00.000Z'),
        type: 'GENERAL',
      },
      osbb: {
        name: 'ОСББ Добрі сусіди',
        address: 'вул. Шевченка, 1',
      },
      owner: {
        shortName: 'Ґалаган Є.Ї.',
        apartmentNumber: '15',
        totalArea: '67.50',
        ownershipDocument: 'Договір купівлі-продажу №123',
        ownershipNumerator: 1,
        ownershipDenominator: 1,
        ownedArea: '67.50',
        representativeName: null,
        representativeDocument: null,
      },
      organizerName: 'Іващенко Ґалина Євгенівна',
      questions: [
        {
          orderNumber: 1,
          text: 'Затвердження кошторису',
          proposal: 'Затвердити кошторис на 2026 рік',
          vote: 'FOR',
        },
        {
          orderNumber: 2,
          text: 'Фінансування ремонту',
          proposal: 'Виділити резервний фонд на ремонт',
          vote: 'AGAINST',
        },
      ],
    });

    assert.equal(Buffer.from(result.pdfBytes).subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(result.pdfBytes.length > 1024);
    const rawPdf = Buffer.from(result.pdfBytes).toString('latin1');
    assert.ok(rawPdf.includes('/Identity-H'), 'Expected Unicode font encoding in generated PDF');
    assert.ok(!rawPdf.includes('/WinAnsiEncoding'), 'Expected no WinAnsi fallback encoding');
    assert.ok(!rawPdf.includes('/BaseFont /Helvetica'), 'Expected no Helvetica fallback font');
    assert.ok(rawPdf.includes('DejaVuSans'), 'Expected bundled DejaVuSans font in generated PDF');
    assert.ok(
      result.generationMs < 3000,
      `Expected generation < 3000ms, got ${result.generationMs}ms`,
    );

    const loadedPdf = await PDFDocument.load(result.pdfBytes);
    assert.ok(loadedPdf.getPageCount() >= 1);
  });
});
