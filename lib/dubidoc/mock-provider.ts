import { randomUUID } from 'node:crypto';
import type { DocumentSigningService } from '@/lib/dubidoc/adapter';
import type {
  DocumentCreateResult,
  DocumentParticipantInput,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';

type MockDocumentRecord = {
  id: string;
  title: string;
  fileBuffer: Uint8Array;
  participants: DocumentParticipantInput[];
  statusChecks: number;
  ownerSignedAt: Date | null;
  organizerSignedAt: Date | null;
};

const mockDocuments = new Map<string, MockDocumentRecord>();

function createMockDocumentId(): string {
  return `mock-doc-${randomUUID()}`;
}

function requireMockDocument(documentId: string): MockDocumentRecord {
  const document = mockDocuments.get(documentId);
  if (!document) {
    throw new Error(`[Dubidoc mock] Document ${documentId} not found.`);
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

  async downloadSigned(documentId: string): Promise<Uint8Array> {
    const document = requireMockDocument(documentId);
    const status = resolveStatus(document);

    if (status.status !== 'ORGANIZER_SIGNED') {
      throw new Error('[Dubidoc mock] Document is not fully signed yet.');
    }

    const p7sBody = [
      '-----BEGIN PKCS7-----',
      `mock-document-id:${document.id}`,
      `title:${document.title}`,
      `bytes:${document.fileBuffer.byteLength}`,
      '-----END PKCS7-----',
    ].join('\n');

    return new TextEncoder().encode(p7sBody);
  }
}
