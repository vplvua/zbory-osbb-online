import { z } from 'zod';
import type { DocumentSigningService } from '@/lib/dubidoc/adapter';
import type {
  DocumentCreateResult,
  DocumentParticipantInput,
  DocumentStatus,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';

const DUBIDOC_BASE_URL = 'https://api.dubidoc.com.ua';
const DUBIDOC_TIMEOUT_MS = 30_000;
const DUBIDOC_MAX_RETRIES = 3;
const DUBIDOC_RETRY_BACKOFF_MS = [1_000, 2_000, 4_000] as const;

const dubidocErrorSchema = z
  .object({
    title: z.string().optional(),
    detail: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const createDocumentResponseSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();

const participantResultSchema = z
  .object({
    executionDate: z.string().optional(),
  })
  .passthrough();

const participantStatusSchema = z
  .object({
    priority: z.number().int().optional(),
    status: z.string().optional(),
    result: participantResultSchema.nullish(),
  })
  .passthrough();

const documentDetailsSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().optional(),
    participants: z.array(participantStatusSchema).optional(),
  })
  .passthrough();

const participantsListSchema = z.array(participantStatusSchema);

type ParticipantRequestBody = {
  action: 'sign';
  email: string;
  edrpou?: string;
  priority: number;
  isSignatureRequired: true;
};

type DubidocParticipantState = z.infer<typeof participantStatusSchema>;

export type DubidocConfig = {
  apiKey: string;
  orgId: string;
  baseUrl?: string;
  callbackUrl?: string;
};

type RequestOptions = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  expected: 'json' | 'bytes';
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function classifyDubidocHttpStatus(status: number, message: string) {
  const code = `DUBIDOC_HTTP_${status}`;

  if (status === 401 || status === 403) {
    return new CriticalError(message, { code });
  }

  if (isRetryableStatus(status)) {
    return new TemporaryError(message, { code });
  }

  return new PermanentError(message, { code });
}

function classifyDubidocRequestError(error: unknown) {
  if (error instanceof TypeError) {
    const message = error.message.trim() || '[Dubidoc] Network request failed.';
    return new TemporaryError(message, {
      code: 'DUBIDOC_NETWORK_ERROR',
      cause: error,
    });
  }

  return classifyError(error);
}

function toDocumentFilename(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);

  return `${base || 'sheet'}.pdf`;
}

function extractSignedAt(participant: DubidocParticipantState): string | null {
  return participant.result?.executionDate ?? null;
}

function isParticipantSigned(participant: DubidocParticipantState): boolean {
  if (participant.status?.toLowerCase() === 'signed') {
    return true;
  }

  return Boolean(extractSignedAt(participant));
}

function toInternalStatus(
  documentStatus: string | undefined,
  ownerParticipant: DubidocParticipantState | null,
  organizerParticipant: DubidocParticipantState | null,
): DocumentStatus {
  const ownerSigned = ownerParticipant ? isParticipantSigned(ownerParticipant) : false;
  const organizerSigned = organizerParticipant ? isParticipantSigned(organizerParticipant) : false;

  if (organizerSigned) {
    return 'ORGANIZER_SIGNED';
  }

  if (ownerSigned) {
    return 'OWNER_SIGNED';
  }

  const normalized = documentStatus?.toLowerCase();
  if (normalized === 'signed' || normalized === 'approved' || normalized === 'filled') {
    return 'ORGANIZER_SIGNED';
  }

  if (normalized === 'waiting_for_contractor_sign') {
    return 'OWNER_SIGNED';
  }

  return 'CREATED';
}

function mapParticipantToRequest(
  participant: DocumentParticipantInput,
  priority: number,
): ParticipantRequestBody {
  if (!participant.email) {
    throw new PermanentError(
      `[Dubidoc] Participant ${participant.fullName} is missing email. Email is required for API participant creation.`,
      { code: 'DUBIDOC_PARTICIPANT_EMAIL_REQUIRED' },
    );
  }

  // TODO: Dubidoc schema marks `edrpou` as required while docs describe email-only participant flow.
  // Verify with production behavior and tighten validation/mapping when confirmed.
  return {
    action: 'sign',
    email: participant.email,
    edrpou: participant.edrpou,
    priority,
    isSignatureRequired: true,
  };
}

function sortParticipantsForSigning(
  participants: DocumentParticipantInput[],
): DocumentParticipantInput[] {
  // MVP assumption: owner must sign first, organizer second.
  return [...participants].sort((a, b) => {
    const score = (role: DocumentParticipantInput['role']) => (role === 'OWNER' ? 0 : 1);
    return score(a.role) - score(b.role);
  });
}

export class DubidocApiSigningService implements DocumentSigningService {
  private readonly baseUrl: string;
  private readonly callbackUrl?: string;

  constructor(private readonly config: DubidocConfig) {
    this.baseUrl = (config.baseUrl ?? DUBIDOC_BASE_URL).replace(/\/+$/, '');
    this.callbackUrl = config.callbackUrl?.trim() || undefined;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Access-Token': this.config.apiKey,
      'X-Organization': this.config.orgId,
    };
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const maxAttempts = DUBIDOC_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DUBIDOC_TIMEOUT_MS);

      try {
        const response = await fetch(`${this.baseUrl}${options.path}`, {
          method: options.method,
          headers: this.headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = `[Dubidoc] ${options.method} ${options.path} failed with status ${response.status}.`;
          try {
            const parsedError = dubidocErrorSchema.safeParse(await response.json());
            if (parsedError.success) {
              const detail =
                parsedError.data.detail ?? parsedError.data.message ?? parsedError.data.title;
              if (detail) {
                errorMessage = `${errorMessage} ${detail}`;
              }
            }
          } catch {
            // Ignore parse failures and use default error message.
          }

          throw classifyDubidocHttpStatus(response.status, errorMessage);
        }

        if (options.expected === 'bytes') {
          const buffer = await response.arrayBuffer();
          return new Uint8Array(buffer) as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        const classified = classifyDubidocRequestError(error);
        const shouldRetry = attempt < maxAttempts && classified instanceof TemporaryError;
        if (shouldRetry) {
          const backoff =
            DUBIDOC_RETRY_BACKOFF_MS[Math.min(attempt - 1, DUBIDOC_RETRY_BACKOFF_MS.length - 1)];
          console.warn('[dubidoc:http] request retry scheduled', {
            method: options.method,
            path: options.path,
            attempt,
            retryInMs: backoff,
          });
          await sleep(backoff);
          continue;
        }

        throw classified;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new TemporaryError('[Dubidoc] Retry attempts exhausted.', {
      code: 'DUBIDOC_RETRY_EXHAUSTED',
    });
  }

  async createDocument(fileBuffer: Uint8Array, title: string): Promise<DocumentCreateResult> {
    const payload = {
      file: Buffer.from(fileBuffer).toString('base64'),
      title,
      filename: toDocumentFilename(title),
      callbackUrl: this.callbackUrl,
    };

    const response = await this.request<unknown>({
      method: 'POST',
      path: '/api/v1/documents',
      body: payload,
      expected: 'json',
    });

    const parsed = createDocumentResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new CriticalError('[Dubidoc] Unexpected create document response format.', {
        code: 'DUBIDOC_INVALID_CREATE_RESPONSE',
      });
    }

    return {
      documentId: parsed.data.id,
    };
  }

  async addParticipants(
    documentId: string,
    participants: DocumentParticipantInput[],
  ): Promise<void> {
    const ordered = sortParticipantsForSigning(participants);

    for (let index = 0; index < ordered.length; index += 1) {
      const participant = ordered[index];
      const body = mapParticipantToRequest(participant, index + 1);

      await this.request<unknown>({
        method: 'POST',
        path: `/api/v1/documents/${encodeURIComponent(documentId)}/participants`,
        body,
        expected: 'json',
      });
    }
  }

  async createDocumentWithParticipants(
    fileBuffer: Uint8Array,
    title: string,
    participants: DocumentParticipantInput[],
  ): Promise<DocumentCreateResult> {
    const created = await this.createDocument(fileBuffer, title);

    if (participants.length) {
      await this.addParticipants(created.documentId, participants);

      // Sequential route requires explicit flow start after participants are added.
      await this.request<unknown>({
        method: 'POST',
        path: `/api/v1/documents/${encodeURIComponent(created.documentId)}/send`,
        expected: 'json',
      });
    }

    return created;
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    const detailsRaw = await this.request<unknown>({
      method: 'GET',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}`,
      expected: 'json',
    });

    const details = documentDetailsSchema.safeParse(detailsRaw);
    if (!details.success) {
      throw new CriticalError('[Dubidoc] Unexpected get status response format.', {
        code: 'DUBIDOC_INVALID_STATUS_RESPONSE',
      });
    }

    let participants = details.data.participants ?? [];
    if (!participants.length) {
      const participantsRaw = await this.request<unknown>({
        method: 'GET',
        path: `/api/v1/documents/${encodeURIComponent(documentId)}/participants`,
        expected: 'json',
      });

      const parsedParticipants = participantsListSchema.safeParse(participantsRaw);
      if (parsedParticipants.success) {
        participants = parsedParticipants.data;
      }
    }

    const sorted = [...participants].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const ownerParticipant = sorted[0] ?? null;
    const organizerParticipant = sorted[1] ?? null;

    return {
      documentId: details.data.id,
      status: toInternalStatus(details.data.status, ownerParticipant, organizerParticipant),
      ownerSignedAt: extractSignedAt(ownerParticipant) ?? null,
      organizerSignedAt: extractSignedAt(organizerParticipant) ?? null,
    };
  }

  async downloadSigned(documentId: string): Promise<Uint8Array> {
    return this.request<Uint8Array>({
      method: 'GET',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}/download?file=signed&type=attachment`,
      expected: 'bytes',
    });
  }
}
