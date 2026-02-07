export type DocumentParticipantRole = 'OWNER' | 'ORGANIZER';

export type DocumentParticipantInput = {
  role: DocumentParticipantRole;
  fullName: string;
  email?: string;
  phone?: string;
  edrpou?: string;
};

export type DocumentStatus = 'CREATED' | 'OWNER_SIGNED' | 'ORGANIZER_SIGNED';

export type DocumentCreateResult = {
  documentId: string;
};

export type DocumentStatusResult = {
  documentId: string;
  status: DocumentStatus;
  ownerSignedAt: string | null;
  organizerSignedAt: string | null;
};
