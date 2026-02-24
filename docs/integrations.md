# Integrations

## MVP Credentials Model

MVP uses one global set of integration credentials from environment variables.
Per-user keys are intentionally not enabled in settings UI.

Variables:

- `DUBIDOC_API_KEY`
- `DUBIDOC_ORG_ID`
- `TURBOSMS_API_KEY`
- `TURBOSMS_SENDER`
- `OPENAI_API_KEY` (Stage 2)

Prepared UI for future per-user keys:

- `app/dashboard/settings/integrations-settings-section.tsx`

## Runtime Guardrails

Integration envs are validated on server startup.

- Development/Preview: placeholders are allowed, mock adapters remain enabled.
- Production: missing/placeholder required integration envs fail startup with explicit diagnostics.

Required in production:

- `TURBOSMS_API_KEY`
- `TURBOSMS_SENDER`
- `DUBIDOC_API_KEY`
- `DUBIDOC_ORG_ID`

## TurboSMS Adapter

Use:

```ts
import { getSmsAdapter } from '@/lib/sms/adapter';
```

Mode selection:

- Mock mode: if `TURBOSMS_API_KEY` is empty or placeholder, codes are logged and request returns success.
- Real mode: if `TURBOSMS_API_KEY` is configured, app uses `POST https://api.turbosms.ua/message/send.json` with bearer token.

In real mode, `TURBOSMS_SENDER` must be configured.

## Dubidoc Adapter

Use:

```ts
import { getDocumentSigningService } from '@/lib/dubidoc/adapter';
```

Mode selection:

- Mock provider is default.
- Real provider is enabled only when both `DUBIDOC_API_KEY` and `DUBIDOC_ORG_ID` are non-empty, non-placeholder values.
- Base URL in real mode: `https://api.dubidoc.com.ua`.

Callback URL source:

- `DUBIDOC_CALLBACK_URL`, or fallback `${NEXTAUTH_URL}/api/webhooks/dubidoc`.

To force mock mode in local dev:

```env
DUBIDOC_API_KEY=
DUBIDOC_ORG_ID=
```

Mock status sequence for `getDocumentStatus()`:

1. `CREATED`
2. `OWNER_SIGNED`
3. `ORGANIZER_SIGNED` (and further)

## Webhooks

Production endpoint:

- `POST /api/webhooks/dubidoc`

Verification policy:

- Production: `DUBIDOC_WEBHOOK_SECRET` is mandatory.
- Request must include matching `x-dubidoc-webhook-secret`.
- Missing secret in production -> `503` (misconfiguration).
- Invalid/missing webhook header -> `401`.

Replay/idempotency policy:

- State transitions are idempotent (`updateMany` with state guards), so duplicate events do not apply duplicate state changes.
- Ambiguous `SIGNATURE` events without participant identity (`participantRole`/known email) are ignored to avoid replay-driven misclassification.

Current limitations:

- Shared-secret check validates origin knowledge only and does not provide cryptographic payload integrity/non-repudiation.

Migration path to official Dubidoc signature verification:

1. Add official signature headers/body canonicalization from Dubidoc docs.
2. Verify request signature before JSON parsing/state processing.
3. Keep shared-secret as fallback during rollout, then remove once provider signature is stable across environments.
4. Update `DECISIONS.md` and this document when migration is completed.

Dev simulator (mock mode only):

- `POST /api/dev/dubidoc/mock-webhook`

Example:

```bash
curl -X POST http://localhost:3000/api/dev/dubidoc/mock-webhook \
  -H "content-type: application/json" \
  -d '{"documentId":"mock-doc-123","event":"OWNER_SIGNED"}'
```

## SMS Login (MVP)

Routes:

```text
/login
/verify
```

Rate limiting: up to 3 OTP request/verify attempts per 15 minutes per phone.
