import { MockDocumentSigningService } from '@/lib/dubidoc/mock-provider';
import { DubidocApiSigningService } from '@/lib/dubidoc/real-provider';
import { assertIntegrationEnvGuardrails, isConfiguredEnvValue } from '@/lib/integrations/env-guard';
import type {
  DocumentCreateResult,
  DocumentParticipantInput,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';

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

export function isDubidocConfigured(): boolean {
  return (
    isConfiguredEnvValue(process.env.DUBIDOC_API_KEY) &&
    isConfiguredEnvValue(process.env.DUBIDOC_ORG_ID)
  );
}

export function getDocumentSigningService(): DocumentSigningService {
  assertIntegrationEnvGuardrails();

  if (isDubidocConfigured()) {
    const callbackUrl =
      process.env.DUBIDOC_CALLBACK_URL?.trim() ||
      (process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL.replace(/\/+$/, '')}/api/webhooks/dubidoc`
        : undefined);

    return new DubidocApiSigningService({
      apiKey: process.env.DUBIDOC_API_KEY!.trim(),
      orgId: process.env.DUBIDOC_ORG_ID!.trim(),
      callbackUrl,
    });
  }

  return new MockDocumentSigningService();
}
