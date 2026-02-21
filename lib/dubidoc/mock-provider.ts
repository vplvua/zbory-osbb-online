import { randomUUID } from 'node:crypto';
import type { DocumentSigningService } from '@/lib/dubidoc/adapter';
import type {
  DocumentCreateResult,
  DocumentDownloadResult,
  DocumentDownloadVariant,
  DocumentParticipantInput,
  DocumentSigningLinkResult,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';
import { PermanentError, TemporaryError } from '@/lib/errors';

type MockDocumentRecord = {
  id: string;
  title: string;
  fileBuffer: Uint8Array;
  participants: DocumentParticipantInput[];
  statusChecks: number;
  ownerSignedAt: Date | null;
  organizerSignedAt: Date | null;
  signingLinkToken: string | null;
};

const mockDocuments = new Map<string, MockDocumentRecord>();
const textEncoder = new TextEncoder();

function createMockDocumentId(): string {
  return `mock-doc-${randomUUID()}`;
}

function requireMockDocument(documentId: string): MockDocumentRecord {
  const document = mockDocuments.get(documentId);
  if (!document) {
    throw new PermanentError(`[Dubidoc mock] Document ${documentId} not found.`, {
      code: 'DUBIDOC_MOCK_DOCUMENT_NOT_FOUND',
    });
  }

  return document;
}

function resolveStatus(document: MockDocumentRecord): DocumentStatusResult {
  document.statusChecks += 1;

  const hasOwner = document.participants.some((participant) => participant.role === 'OWNER');
  const hasOrganizer = document.participants.some(
    (participant) => participant.role === 'ORGANIZER',
  );

  if (hasOwner && !document.ownerSignedAt && document.statusChecks >= 2) {
    document.ownerSignedAt = new Date();
  }

  if (
    hasOrganizer &&
    document.ownerSignedAt &&
    !document.organizerSignedAt &&
    document.statusChecks >= 3
  ) {
    document.organizerSignedAt = new Date();
  }

  const status = document.organizerSignedAt
    ? 'ORGANIZER_SIGNED'
    : document.ownerSignedAt
      ? 'OWNER_SIGNED'
      : 'CREATED';

  return {
    documentId: document.id,
    status,
    ownerSignedAt: document.ownerSignedAt?.toISOString() ?? null,
    organizerSignedAt: document.organizerSignedAt?.toISOString() ?? null,
  };
}

function toMockFileBaseName(document: MockDocumentRecord): string {
  const base = document.title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);

  return base || `sheet-${document.id}`;
}

function buildMockSignedPayload(document: MockDocumentRecord): Uint8Array {
  const p7sBody = [
    '-----BEGIN PKCS7-----',
    `mock-document-id:${document.id}`,
    `title:${document.title}`,
    `bytes:${document.fileBuffer.byteLength}`,
    '-----END PKCS7-----',
  ].join('\n');

  return textEncoder.encode(p7sBody);
}

function makeMockDownloadResult(
  document: MockDocumentRecord,
  variant: DocumentDownloadVariant,
): DocumentDownloadResult {
  const baseName = toMockFileBaseName(document);
  if (variant === 'signed') {
    return {
      documentId: document.id,
      variant,
      bytes: buildMockSignedPayload(document),
      contentType: 'application/pkcs7-signature',
      contentDisposition: `attachment; filename="${baseName}-signed.p7s"`,
      filename: `${baseName}-signed.p7s`,
    };
  }

  const filename =
    variant === 'original'
      ? `${baseName}.pdf`
      : variant === 'printable'
        ? `${baseName}-printable.pdf`
        : `${baseName}-protocol.pdf`;

  return {
    documentId: document.id,
    variant,
    bytes: Uint8Array.from(document.fileBuffer),
    contentType: 'application/pdf',
    contentDisposition: `attachment; filename="${filename}"`,
    filename,
  };
}

export class MockDocumentSigningService implements DocumentSigningService {
  async createDocument(fileBuffer: Uint8Array, title: string): Promise<DocumentCreateResult> {
    const documentId = createMockDocumentId();

    mockDocuments.set(documentId, {
      id: documentId,
      title,
      fileBuffer: Uint8Array.from(fileBuffer),
      participants: [],
      statusChecks: 0,
      ownerSignedAt: null,
      organizerSignedAt: null,
      signingLinkToken: null,
    });

    return { documentId };
  }

  async addParticipants(
    documentId: string,
    participants: DocumentParticipantInput[],
  ): Promise<void> {
    const document = requireMockDocument(documentId);
    document.participants = participants.map((participant) => ({ ...participant }));
  }

  async createDocumentWithParticipants(
    fileBuffer: Uint8Array,
    title: string,
    participants: DocumentParticipantInput[],
  ): Promise<DocumentCreateResult> {
    const result = await this.createDocument(fileBuffer, title);
    await this.addParticipants(result.documentId, participants);
    return result;
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    const document = requireMockDocument(documentId);
    return resolveStatus(document);
  }

  async generateSigningLink(
    documentId: string,
    days?: number | null,
  ): Promise<DocumentSigningLinkResult> {
    void days;

    const document = requireMockDocument(documentId);
    if (!document.signingLinkToken) {
      document.signingLinkToken = randomUUID();
    }

    return {
      documentId: document.id,
      url: `https://mock.dubidoc.local/sign/${encodeURIComponent(document.id)}/${encodeURIComponent(document.signingLinkToken)}`,
    };
  }

  async downloadDocumentFile(
    documentId: string,
    variant: DocumentDownloadVariant,
  ): Promise<DocumentDownloadResult> {
    const document = requireMockDocument(documentId);
    if (variant === 'signed') {
      const status = resolveStatus(document);

      if (status.status === 'CREATED') {
        throw new TemporaryError('[Dubidoc mock] Document is not fully signed yet.', {
          code: 'DUBIDOC_MOCK_NOT_SIGNED',
        });
      }
    }

    return makeMockDownloadResult(document, variant);
  }

  async revokePublicLinks(documentId: string): Promise<void> {
    const document = requireMockDocument(documentId);
    document.signingLinkToken = null;
  }
}
