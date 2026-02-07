import type { DocumentSigningService } from '@/lib/dubidoc/adapter';
import type {
  DocumentCreateResult,
  DocumentParticipantInput,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';

export type DubidocConfig = {
  apiKey: string;
  orgId: string;
};

export class DubidocApiSigningService implements DocumentSigningService {
  constructor(private readonly config: DubidocConfig) {}

  async createDocument(fileBuffer: Uint8Array, title: string): Promise<DocumentCreateResult> {
    void fileBuffer;
    void title;
    void this.config;
    throw new Error('[Dubidoc] Real API integration is not implemented yet.');
  }

  async addParticipants(
    documentId: string,
    participants: DocumentParticipantInput[],
  ): Promise<void> {
    void documentId;
    void participants;
    void this.config;
    throw new Error('[Dubidoc] Real API integration is not implemented yet.');
  }

  async createDocumentWithParticipants(
    fileBuffer: Uint8Array,
    title: string,
    participants: DocumentParticipantInput[],
  ): Promise<DocumentCreateResult> {
    void fileBuffer;
    void title;
    void participants;
    void this.config;
    throw new Error('[Dubidoc] Real API integration is not implemented yet.');
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    void documentId;
    void this.config;
    throw new Error('[Dubidoc] Real API integration is not implemented yet.');
  }

  async downloadSigned(documentId: string): Promise<Uint8Array> {
    void documentId;
    void this.config;
    throw new Error('[Dubidoc] Real API integration is not implemented yet.');
  }
}
