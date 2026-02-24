import { classifyError } from '@/lib/errors';

type OpsLogLevel = 'info' | 'warn' | 'error';

export type OpsLogPayload = {
  component: string;
  event: string;
  outcome?: string;
  sheetId?: string | null;
  documentId?: string | null;
  attempt?: number;
  maxAttempts?: number;
  retryInMs?: number;
  errorCode?: string;
  errorType?: string;
  errorName?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

function compactPayload(payload: OpsLogPayload): Record<string, unknown> {
  const entries = Object.entries(payload).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return Object.fromEntries(entries);
}

function writeOpsLog(level: OpsLogLevel, payload: OpsLogPayload): void {
  const record = compactPayload(payload);

  if (level === 'error') {
    console.error('[ops]', record);
    return;
  }

  if (level === 'warn') {
    console.warn('[ops]', record);
    return;
  }

  console.info('[ops]', record);
}

export function getOpsErrorFields(
  error: unknown,
): Pick<OpsLogPayload, 'errorCode' | 'errorType' | 'errorName' | 'errorMessage'> {
  const classified = classifyError(error);
  return {
    errorCode: classified.code,
    errorType: classified.type,
    errorName: classified.name,
    errorMessage: classified.message,
  };
}

export function logOpsInfo(payload: OpsLogPayload): void {
  writeOpsLog('info', payload);
}

export function logOpsWarn(payload: OpsLogPayload): void {
  writeOpsLog('warn', payload);
}

export function logOpsError(payload: OpsLogPayload): void {
  writeOpsLog('error', payload);
}
