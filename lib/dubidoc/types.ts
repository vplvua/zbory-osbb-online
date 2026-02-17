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

export type DocumentDownloadVariant = 'original' | 'signed' | 'printable' | 'protocol';

export type DocumentDownloadResult = {
  documentId: string;
  variant: DocumentDownloadVariant;
  bytes: Uint8Array;
  contentType: string;
  contentDisposition: string | null;
  filename: string | null;
};

export type DocumentSigningLinkResult = {
  documentId: string;
  url: string;
};

export type DocumentStatusResult = {
  documentId: string;
  status: DocumentStatus;
  ownerSignedAt: string | null;
  organizerSignedAt: string | null;
};
