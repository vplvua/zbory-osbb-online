import { SheetStatus, Vote } from '@prisma/client';

export type VoteSheetOwnerDto = {
  fullName: string;
  apartmentNumber: string;
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
};
