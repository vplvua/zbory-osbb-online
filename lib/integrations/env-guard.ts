import { z } from 'zod';

const ENV_PLACEHOLDER_PREFIX = 'replace-with-';

type RuntimeStage = 'development' | 'preview' | 'production';

type EnvIssue = {
  key: string;
  reason: string;
  hint: string;
};

const turboSmsSenderSchema = z.string().trim().min(1).max(32);

let validationCompleted = false;
let lastValidationError: Error | null = null;
let warnedPreview = false;

function readTrimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function isPlaceholderEnvValue(value: string | undefined): boolean {
  return readTrimmed(value).toLowerCase().startsWith(ENV_PLACEHOLDER_PREFIX);
}

export function isConfiguredEnvValue(value: string | undefined): boolean {
  const normalized = readTrimmed(value);
  return normalized.length > 0 && !isPlaceholderEnvValue(normalized);
}

function detectRuntimeStage(): RuntimeStage {
  const vercelEnv = readTrimmed(process.env.VERCEL_ENV).toLowerCase();
  if (vercelEnv === 'preview') {
    return 'preview';
  }

  if (vercelEnv === 'production') {
    return 'production';
  }

  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }

  return 'development';
}

function checkRequiredConfigured(key: string): EnvIssue | null {
  const value = process.env[key];
  if (isConfiguredEnvValue(value)) {
    return null;
  }

  if (isPlaceholderEnvValue(value)) {
    return {
      key,
      reason: 'placeholder value detected',
      hint: 'Set a real secret in production environment variables.',
    };
  }

  return {
    key,
    reason: 'missing value',
    hint: 'Add this variable in production environment variables.',
  };
}

function checkTurboSmsSenderFormat(): EnvIssue | null {
  const value = process.env.TURBOSMS_SENDER;
  if (!isConfiguredEnvValue(value)) {
    return null;
  }

  const parsed = turboSmsSenderSchema.safeParse(value);
  if (parsed.success) {
    return null;
  }

  return {
    key: 'TURBOSMS_SENDER',
    reason: 'invalid sender format',
    hint: 'Use non-empty sender with max length 32 characters.',
  };
}

function collectProductionIssues(): EnvIssue[] {
  const checks: Array<() => EnvIssue | null> = [
    () => checkRequiredConfigured('TURBOSMS_API_KEY'),
    () => checkRequiredConfigured('TURBOSMS_SENDER'),
    () => checkRequiredConfigured('DUBIDOC_API_KEY'),
    () => checkRequiredConfigured('DUBIDOC_ORG_ID'),
    checkTurboSmsSenderFormat,
  ];

  const issues: EnvIssue[] = [];
  for (const check of checks) {
    const issue = check();
    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}

function formatProductionErrorMessage(issues: EnvIssue[]): string {
  const lines = ['[integrations] Production integration env validation failed.'];
  for (const issue of issues) {
    lines.push(`- ${issue.key}: ${issue.reason}. ${issue.hint}`);
  }
  lines.push('Remediation: replace `replace-with-*` placeholders with real values, then redeploy.');
  lines.push('Note: mock integrations are allowed only in development/preview modes.');
  return lines.join('\n');
}

function logPreviewInfo(): void {
  if (warnedPreview) {
    return;
  }

  const maybeMockKeys = [
    'TURBOSMS_API_KEY',
    'TURBOSMS_SENDER',
    'DUBIDOC_API_KEY',
    'DUBIDOC_ORG_ID',
  ] as const;
  const hasMockConfig = maybeMockKeys.some((key) => !isConfiguredEnvValue(process.env[key]));
  if (!hasMockConfig) {
    return;
  }

  warnedPreview = true;
  console.info(
    '[integrations] Running in preview/development mode. Placeholder integration env values keep mock adapters enabled.',
  );
}

export function assertIntegrationEnvGuardrails(): void {
  if (validationCompleted) {
    if (lastValidationError) {
      throw lastValidationError;
    }

    return;
  }

  const stage = detectRuntimeStage();
  if (stage !== 'production') {
    logPreviewInfo();
    validationCompleted = true;
    return;
  }

  const issues = collectProductionIssues();
  if (issues.length === 0) {
    validationCompleted = true;
    return;
  }

  const message = formatProductionErrorMessage(issues);
  const error = new Error(message);
  error.name = 'IntegrationEnvValidationError';
  lastValidationError = error;
  validationCompleted = true;
  console.error(message);
  throw error;
}
