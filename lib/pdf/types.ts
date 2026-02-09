import { Vote } from '@prisma/client';

export type VoteSheetPdfQuestionInput = {
  orderNumber: number;
  text: string;
  proposal: string;
  vote: Vote | null;
};

export type VoteSheetPdfInput = {
  sheetId: string;
  generatedAt: Date;
  surveyDate: Date;
  protocol: {
    number: string;
    date: Date;
  };
  osbb: {
    name: string;
    address: string;
  };
  owner: {
    shortName: string;
    apartmentNumber: string;
    totalArea: string;
    ownershipDocument: string;
    ownershipNumerator: number;
    ownershipDenominator: number;
    ownedArea: string;
    representativeName: string | null;
    representativeDocument: string | null;
  };
  organizerName: string;
  questions: VoteSheetPdfQuestionInput[];
};

export type VoteSheetPdfResult = {
  pdfBytes: Uint8Array;
  generationMs: number;
};
