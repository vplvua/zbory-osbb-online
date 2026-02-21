import { SheetStatus, Vote } from '@prisma/client';

export type VoteSheetOwnerDto = {
  shortName: string;
  apartmentNumber: string;
  totalArea: string;
  ownedArea: string;
  ownershipNumerator: number;
  ownershipDenominator: number;
};

export type VoteSheetQuestionDto = {
  id: string;
  orderNumber: number;
  text: string;
  proposal: string;
  requiresTwoThirds: boolean;
  vote: Vote | null;
};

export type VoteSheetDto = {
  id: string;
  status: SheetStatus;
  effectiveStatus: SheetStatus;
  ownerSignedAt: string | null;
  organizerSignedAt: string | null;
  dubidocSignPending: boolean;
  dubidocLastError: string | null;
  hasDubidocDocument: boolean;
  pdfUploadPending: boolean;
  errorPending: boolean;
  hasPdfFile: boolean;
  surveyDate: string;
  createdAt: string;
  expiresAt: string;
  protocolDate: string;
  protocolNumber: string;
  osbbName: string;
  owner: VoteSheetOwnerDto;
  questions: VoteSheetQuestionDto[];
};

export type VoteSheetResponseDto = {
  sheet: VoteSheetDto;
};

export type VoteSubmitResponseDto = {
  ok: true;
  message: string;
  sheet: VoteSheetDto;
  redirectUrl?: string;
};
