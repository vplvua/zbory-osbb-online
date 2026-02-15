import { assertIntegrationEnvGuardrails } from '@/lib/integrations/env-guard';

export async function register() {
  assertIntegrationEnvGuardrails();
}
