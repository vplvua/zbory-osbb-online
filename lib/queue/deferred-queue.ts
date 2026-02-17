import { type DeferredQueue, type Prisma } from '@prisma/client';
import { getDocumentSigningService } from '@/lib/dubidoc/adapter';
import { prisma } from '@/lib/db/prisma';
import { getBackoffDelayMs, retryPresets, type RetryBackoffOptions } from '@/lib/retry/withRetry';

export const DEFERRED_QUEUE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

export type DeferredQueueStatus =
  (typeof DEFERRED_QUEUE_STATUS)[keyof typeof DEFERRED_QUEUE_STATUS];

export const DEFERRED_QUEUE_JOB_TYPES = {
  NOOP: 'NOOP',
  DUBIDOC_REVOKE_PUBLIC_LINKS: 'DUBIDOC_REVOKE_PUBLIC_LINKS',
} as const;

export type DeferredQueueJobType =
  | (typeof DEFERRED_QUEUE_JOB_TYPES)[keyof typeof DEFERRED_QUEUE_JOB_TYPES]
  | (string & {});

export type EnqueueDeferredJobInput = {
  type: DeferredQueueJobType;
  payload?: Prisma.InputJsonValue;
  runAt?: Date;
};

export type DeferredQueueJobHandler = (job: DeferredQueue) => Promise<void>;

export type DeferredQueueJobDefinition = {
  handler: DeferredQueueJobHandler;
  maxAttempts: number;
  backoff?: RetryBackoffOptions;
};

export type DeferredQueueDefinitions = Record<string, DeferredQueueJobDefinition>;

export type ProcessDeferredQueueOptions = {
  limit?: number;
  now?: Date;
  definitions?: DeferredQueueDefinitions;
};

export type ProcessDeferredQueueResult = {
  scanned: number;
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
};

function getDubidocDocumentIdFromPayload(payload: Prisma.JsonValue): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as { documentId?: unknown }).documentId;
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const DEFAULT_DEFINITIONS: DeferredQueueDefinitions = {
  [DEFERRED_QUEUE_JOB_TYPES.NOOP]: {
    maxAttempts: 1,
    handler: async () => {},
  },
  [DEFERRED_QUEUE_JOB_TYPES.DUBIDOC_REVOKE_PUBLIC_LINKS]: {
    maxAttempts: retryPresets.dubidoc.maxAttempts,
    backoff: retryPresets.dubidoc.backoff,
    handler: async (job) => {
      const documentId = getDubidocDocumentIdFromPayload(job.payload);
      if (!documentId) {
        return;
      }

      const signingService = getDocumentSigningService();
      await signingService.revokePublicLinks(documentId);
    },
  },
};

function normalizeAttempts(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function toLastError(error: unknown): string {
  if (error instanceof Error) {
    const detail = error.message.trim() || error.name || 'Unknown error';
    return `${error.name}: ${detail}`.slice(0, 3000);
  }

  if (typeof error === 'string') {
    return error.slice(0, 3000);
  }

  try {
    return JSON.stringify(error).slice(0, 3000);
  } catch {
    return 'Unknown non-serializable queue error.';
  }
}

function resolveDefinition(type: string, definitions?: DeferredQueueDefinitions) {
  return definitions?.[type] ?? DEFAULT_DEFINITIONS[type];
}

export async function enqueueDeferredJob(input: EnqueueDeferredJobInput): Promise<DeferredQueue> {
  return prisma.deferredQueue.create({
    data: {
      type: input.type,
      payload: input.payload ?? ({} as Prisma.InputJsonValue),
      status: DEFERRED_QUEUE_STATUS.PENDING,
      runAt: input.runAt ?? new Date(),
    },
  });
}

export async function processDueDeferredQueueJobs(
  options: ProcessDeferredQueueOptions = {},
): Promise<ProcessDeferredQueueResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 200);

  const jobs = await prisma.deferredQueue.findMany({
    where: {
      status: DEFERRED_QUEUE_STATUS.PENDING,
      runAt: {
        lte: now,
      },
    },
    orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const result: ProcessDeferredQueueResult = {
    scanned: jobs.length,
    processed: 0,
    succeeded: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    const claim = await prisma.deferredQueue.updateMany({
      where: {
        id: job.id,
        status: DEFERRED_QUEUE_STATUS.PENDING,
      },
      data: {
        status: DEFERRED_QUEUE_STATUS.PROCESSING,
      },
    });

    if (claim.count !== 1) {
      result.skipped += 1;
      continue;
    }

    const attemptNumber = job.attempts + 1;
    const definition = resolveDefinition(job.type, options.definitions);

    if (!definition) {
      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: DEFERRED_QUEUE_STATUS.FAILED,
          attempts: attemptNumber,
          lastError: `No queue handler for job type: ${job.type}`,
        },
      });

      result.processed += 1;
      result.failed += 1;
      continue;
    }

    try {
      await definition.handler(job);

      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: DEFERRED_QUEUE_STATUS.DONE,
          attempts: attemptNumber,
          lastError: null,
        },
      });

      result.processed += 1;
      result.succeeded += 1;
    } catch (error) {
      const maxAttempts = normalizeAttempts(definition.maxAttempts);
      const shouldRetry = attemptNumber < maxAttempts;
      const delayMs = getBackoffDelayMs(definition.backoff, attemptNumber);

      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? DEFERRED_QUEUE_STATUS.PENDING : DEFERRED_QUEUE_STATUS.FAILED,
          attempts: attemptNumber,
          lastError: toLastError(error),
          runAt: shouldRetry ? new Date(now.getTime() + delayMs) : job.runAt,
        },
      });

      result.processed += 1;
      if (shouldRetry) {
        result.retried += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}
