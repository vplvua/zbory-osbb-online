import { MockDocumentSigningService } from '@/lib/dubidoc/mock-provider';
import { DubidocApiSigningService } from '@/lib/dubidoc/real-provider';
import type {
  DocumentCreateResult,
  DocumentParticipantInput,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';

const ENV_PLACEHOLDER_PREFIX = 'replace-with-';

export interface DocumentSigningService {
  createDocument(fileBuffer: Uint8Array, title: string): Promise<DocumentCreateResult>;
  addParticipants(documentId: string, participants: DocumentParticipantInput[]): Promise<void>;
  createDocumentWithParticipants(
    fileBuffer: Uint8Array,
    title: string,
    participants: DocumentParticipantInput[],
  ): Promise<DocumentCreateResult>;
  getDocumentStatus(documentId: string): Promise<DocumentStatusResult>;
  downloadSigned(documentId: string): Promise<Uint8Array>;
}

function hasEnvValue(value: string | undefined): boolean {
  return Boolean(
    value && value.trim().length > 0 && !value.trim().startsWith(ENV_PLACEHOLDER_PREFIX),
  );
}

export function isDubidocConfigured(): boolean {
  return hasEnvValue(process.env.DUBIDOC_API_KEY) && hasEnvValue(process.env.DUBIDOC_ORG_ID);
}

export function getDocumentSigningService(): DocumentSigningService {
  if (isDubidocConfigured()) {
    return new DubidocApiSigningService({
      apiKey: process.env.DUBIDOC_API_KEY!.trim(),
      orgId: process.env.DUBIDOC_ORG_ID!.trim(),
    });
  }

  return new MockDocumentSigningService();
}
