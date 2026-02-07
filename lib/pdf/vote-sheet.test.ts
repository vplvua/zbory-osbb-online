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
      },
      osbb: {
        name: 'Test OSBB',
        address: 'Test street 1',
      },
      owner: {
        fullName: 'Ivan Petrenko',
        apartmentNumber: '15',
        totalArea: '67.50',
        ownershipDocument: 'Договір купівлі-продажу №123',
        ownershipNumerator: 1,
        ownershipDenominator: 1,
        ownedArea: '67.50',
        representativeName: null,
        representativeDocument: null,
      },
      organizerName: 'Olena Ivanenko',
      questions: [
        {
          orderNumber: 1,
          text: 'Budget approval',
          proposal: 'Approve budget for 2026',
          vote: 'FOR',
        },
        {
          orderNumber: 2,
          text: 'Repair funding',
          proposal: 'Allocate reserve fund for repairs',
          vote: 'AGAINST',
        },
      ],
    });

    assert.equal(Buffer.from(result.pdfBytes).subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(result.pdfBytes.length > 1024);
    assert.ok(
      result.generationMs < 3000,
      `Expected generation < 3000ms, got ${result.generationMs}ms`,
    );

    const loadedPdf = await PDFDocument.load(result.pdfBytes);
    assert.ok(loadedPdf.getPageCount() >= 1);
  });
});
