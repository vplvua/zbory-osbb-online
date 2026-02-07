import { PrismaClient } from '@prisma/client';

const DEFERRED_QUEUE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

type QueueStatus = (typeof DEFERRED_QUEUE_STATUS)[keyof typeof DEFERRED_QUEUE_STATUS];

type QueueJobDefinition = {
  maxAttempts: number;
  handler: () => Promise<void>;
  getRetryDelayMs?: (attemptNumber: number) => number;
};

const prisma = new PrismaClient();

const DEFAULT_DEFINITIONS: Record<string, QueueJobDefinition> = {
  NOOP: {
    maxAttempts: 1,
    handler: async () => {},
  },
};

type WorkerSummary = {
  scanned: number;
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
};

function parseLimit(argv: string[]): number {
  const limitIndex = argv.findIndex((value) => value === '--limit');
  const value = limitIndex >= 0 ? argv[limitIndex + 1] : undefined;
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

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

async function processDueJobs(limit: number): Promise<WorkerSummary> {
  const now = new Date();

  const jobs = await prisma.deferredQueue.findMany({
    where: {
      status: DEFERRED_QUEUE_STATUS.PENDING as QueueStatus,
      runAt: { lte: now },
    },
    orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const summary: WorkerSummary = {
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
      summary.skipped += 1;
      continue;
    }

    const attemptNumber = job.attempts + 1;
    const definition = DEFAULT_DEFINITIONS[job.type];

    if (!definition) {
      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: DEFERRED_QUEUE_STATUS.FAILED,
          attempts: attemptNumber,
          lastError: `No queue handler for job type: ${job.type}`,
        },
      });

      summary.processed += 1;
      summary.failed += 1;
      continue;
    }

    try {
      await definition.handler();
      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: DEFERRED_QUEUE_STATUS.DONE,
          attempts: attemptNumber,
          lastError: null,
        },
      });

      summary.processed += 1;
      summary.succeeded += 1;
    } catch (error) {
      const maxAttempts = normalizeAttempts(definition.maxAttempts);
      const shouldRetry = attemptNumber < maxAttempts;
      const retryDelayMs = definition.getRetryDelayMs?.(attemptNumber) ?? 0;

      await prisma.deferredQueue.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? DEFERRED_QUEUE_STATUS.PENDING : DEFERRED_QUEUE_STATUS.FAILED,
          attempts: attemptNumber,
          lastError: toLastError(error),
          runAt: shouldRetry ? new Date(now.getTime() + retryDelayMs) : job.runAt,
        },
      });

      summary.processed += 1;
      if (shouldRetry) {
        summary.retried += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}

async function main() {
  const limit = parseLimit(process.argv);
  const summary = await processDueJobs(limit);
  console.info('[deferred-queue-worker] summary', summary);
}

main()
  .catch((error: unknown) => {
    console.error('[deferred-queue-worker] fatal error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
