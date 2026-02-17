import { z } from 'zod';
import type { DocumentSigningService } from '@/lib/dubidoc/adapter';
import type {
  DocumentCreateResult,
  DocumentDownloadResult,
  DocumentDownloadVariant,
  DocumentParticipantInput,
  DocumentSigningLinkResult,
  DocumentStatus,
  DocumentStatusResult,
} from '@/lib/dubidoc/types';
import { classifyError, CriticalError, PermanentError, TemporaryError } from '@/lib/errors';
import { retryPresets, withRetry } from '@/lib/retry/withRetry';

const DUBIDOC_BASE_URL = 'https://api.dubidoc.com.ua';

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

const signingLinkResponseSchema = z
  .object({
    link: z.string().url(),
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
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
};

type BinaryRequestResult = {
  bytes: Uint8Array;
  headers: Headers;
};

const DEFAULT_CONTENT_TYPE_BY_VARIANT: Record<DocumentDownloadVariant, string> = {
  original: 'application/pdf',
  printable: 'application/pdf',
  protocol: 'application/pdf',
  signed: 'application/pkcs7-signature',
};

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

function sanitizeHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[\r\n]+/g, ' ').trim();
  return normalized.length ? normalized : null;
}

function parseFilenameToken(token: string): string | null {
  const trimmed = token.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .replace(/[\/\\]/g, '-')
    .replace(/[\r\n\t]/g, '')
    .trim();
  return normalized.length ? normalized : null;
}

function decodeExtendedFilename(token: string): string | null {
  const normalized = token.trim().replace(/^["']|["']$/g, '');
  if (!normalized) {
    return null;
  }

  const parts = normalized.split("'");
  if (parts.length >= 3) {
    const encoded = parts.slice(2).join("'");
    try {
      return parseFilenameToken(decodeURIComponent(encoded));
    } catch {
      return parseFilenameToken(encoded);
    }
  }

  try {
    return parseFilenameToken(decodeURIComponent(normalized));
  } catch {
    return parseFilenameToken(normalized);
  }
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const extended = /filename\*=([^;]+)/i.exec(contentDisposition);
  if (extended) {
    const decoded = decodeExtendedFilename(extended[1]);
    if (decoded) {
      return decoded;
    }
  }

  const basic = /filename=([^;]+)/i.exec(contentDisposition);
  if (basic) {
    return parseFilenameToken(basic[1]);
  }

  return null;
}

function normalizeContentType(value: string | null, variant: DocumentDownloadVariant): string {
  const fallback = DEFAULT_CONTENT_TYPE_BY_VARIANT[variant];
  const normalized = sanitizeHeaderValue(value)?.toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const mime = normalized.split(';', 1)[0]?.trim();
  if (!mime || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mime)) {
    return fallback;
  }

  return mime;
}

function getFallbackFilename(
  documentId: string,
  variant: DocumentDownloadVariant,
  contentType: string,
): string {
  if (variant === 'signed') {
    return contentType === 'application/zip'
      ? `${documentId}-signed.zip`
      : `${documentId}-signed.p7s`;
  }

  if (variant === 'protocol') {
    return `${documentId}-protocol.pdf`;
  }

  if (variant === 'printable') {
    return `${documentId}-printable.pdf`;
  }

  return `${documentId}.pdf`;
}

export class DubidocApiSigningService implements DocumentSigningService {
  private readonly baseUrl: string;
  private readonly callbackUrl?: string;

  constructor(private readonly config: DubidocConfig) {
    this.baseUrl = (config.baseUrl ?? DUBIDOC_BASE_URL).replace(/\/+$/, '');
    this.callbackUrl = config.callbackUrl?.trim() || undefined;
  }

  private get headers(): Record<string, string> {
    return {
      'X-Access-Token': this.config.apiKey,
      'X-Organization': this.config.orgId,
    };
  }

  private buildHeaders(hasBody: boolean): HeadersInit {
    return hasBody
      ? {
          ...this.headers,
          'Content-Type': 'application/json',
        }
      : this.headers;
  }

  private async sendRequest(options: RequestOptions): Promise<Response> {
    return withRetry(
      async ({ signal }) => {
        try {
          const response = await fetch(`${this.baseUrl}${options.path}`, {
            method: options.method,
            headers: this.buildHeaders(Boolean(options.body)),
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal,
          });

          if (!response.ok) {
            let errorMessage = `[Dubidoc] ${options.method} ${options.path} failed with status ${response.status}.`;
            const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
            const rawBody = await response.text();

            if (contentType.includes('application/json')) {
              try {
                const parsedError = dubidocErrorSchema.safeParse(JSON.parse(rawBody));
                if (parsedError.success) {
                  const detail =
                    parsedError.data.detail ?? parsedError.data.message ?? parsedError.data.title;
                  if (detail) {
                    errorMessage = `${errorMessage} ${detail}`;
                  }
                }
              } catch {
                // Ignore parse failures and fallback to plain body handling below.
              }
            }

            if (errorMessage.endsWith(`${response.status}.`)) {
              const detail = rawBody.trim();
              if (detail) {
                errorMessage = `${errorMessage} ${detail.slice(0, 500)}`;
              }
            }

            throw classifyDubidocHttpStatus(response.status, errorMessage);
          }

          return response;
        } catch (error) {
          throw classifyDubidocRequestError(error);
        }
      },
      {
        ...retryPresets.dubidoc,
        shouldRetry: (error) => error instanceof TemporaryError,
        onRetry: ({ attempt, nextDelayMs }) => {
          console.warn('[dubidoc:http] request retry scheduled', {
            method: options.method,
            path: options.path,
            attempt,
            retryInMs: nextDelayMs,
          });
        },
      },
    );
  }

  private async requestJson<T>(options: RequestOptions): Promise<T> {
    const response = await this.sendRequest(options);
    const contentLength = response.headers.get('content-length');
    if (response.status === 204 || contentLength === '0') {
      return null as T;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new CriticalError('[Dubidoc] Unexpected non-JSON response.', {
        code: 'DUBIDOC_INVALID_JSON_RESPONSE',
        cause: error,
      });
    }
  }

  private async requestBinary(options: RequestOptions): Promise<BinaryRequestResult> {
    const response = await this.sendRequest(options);
    const buffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      headers: response.headers,
    };
  }

  async createDocument(fileBuffer: Uint8Array, title: string): Promise<DocumentCreateResult> {
    const payload = {
      file: Buffer.from(fileBuffer).toString('base64'),
      title,
      filename: toDocumentFilename(title),
      callbackUrl: this.callbackUrl,
    };

    const response = await this.requestJson<unknown>({
      method: 'POST',
      path: '/api/v1/documents',
      body: payload,
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

      await this.requestJson<unknown>({
        method: 'POST',
        path: `/api/v1/documents/${encodeURIComponent(documentId)}/participants`,
        body,
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
      // Owner signs first in our MVP flow, so explicit `send` is not required.
      // Dubidoc docs recommend not calling `/send` when the first signature is the document owner.
    }

    return created;
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    const detailsRaw = await this.requestJson<unknown>({
      method: 'GET',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}`,
    });

    const details = documentDetailsSchema.safeParse(detailsRaw);
    if (!details.success) {
      throw new CriticalError('[Dubidoc] Unexpected get status response format.', {
        code: 'DUBIDOC_INVALID_STATUS_RESPONSE',
      });
    }

    let participants = details.data.participants ?? [];
    if (!participants.length) {
      const participantsRaw = await this.requestJson<unknown>({
        method: 'GET',
        path: `/api/v1/documents/${encodeURIComponent(documentId)}/participants`,
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

  async generateSigningLink(
    documentId: string,
    days?: number | null,
  ): Promise<DocumentSigningLinkResult> {
    const response = await this.requestJson<unknown>({
      method: 'POST',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}/links`,
      body: {
        action: 'sign',
        ...(typeof days === 'number' ? { days } : {}),
      },
    });

    const parsed = signingLinkResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new CriticalError('[Dubidoc] Unexpected generate link response format.', {
        code: 'DUBIDOC_INVALID_LINK_RESPONSE',
      });
    }

    return {
      documentId,
      url: parsed.data.link,
    };
  }

  async downloadDocumentFile(
    documentId: string,
    variant: DocumentDownloadVariant,
  ): Promise<DocumentDownloadResult> {
    const query = new URLSearchParams({
      file: variant,
      type: 'attachment',
    });

    const response = await this.requestBinary({
      method: 'GET',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}/download?${query.toString()}`,
    });

    const contentDisposition = sanitizeHeaderValue(response.headers.get('content-disposition'));
    const contentType = normalizeContentType(response.headers.get('content-type'), variant);
    const filename =
      extractFilename(contentDisposition) ?? getFallbackFilename(documentId, variant, contentType);

    return {
      documentId,
      variant,
      bytes: response.bytes,
      contentType,
      contentDisposition,
      filename,
    };
  }

  async revokePublicLinks(documentId: string): Promise<void> {
    await this.requestJson<unknown>({
      method: 'DELETE',
      path: `/api/v1/documents/${encodeURIComponent(documentId)}/links`,
    });
  }
}
