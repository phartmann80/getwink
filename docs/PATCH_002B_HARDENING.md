# GetWink Patch 002B Hardening

## Purpose

This corrective patch hardens the authenticated Mastra route and AI usage audit trail on top of Patch 002B.

Base branch/commit:

- Branch: `patch-002b-mastra-auth-auditing`
- Base commit: `0108eab4ab973a12f4120ad1d84e568909b60ee6`

## Included database change

`supabase/migrations/0002_restrict_ai_usage_event_inserts.sql` removes authenticated client write access to `public.ai_usage_events`.

The server-side service-role client remains responsible for inserting audit events. The service-role key must remain server-only.

## Required application hardening

The team must apply the included migration and update the existing Patch 002B application code to meet these contracts:

### Authentication

- Verify Supabase sessions server-side.
- Derive `userId` only from the verified session.
- Ignore client-supplied `userId` for authorization and auditing.
- Support and test bearer-token and cookie-session paths.
- Reject missing, malformed, expired, deleted, or suspended identities.

### Request body limits

- Keep the early `Content-Length` check.
- Also read the body with a hard 100 KB byte limit.
- Reject bodies that exceed 100 KB even if `Content-Length` is missing.
- Parse JSON only after the byte limit has passed.
- Return a client-safe `REQUEST_TOO_LARGE` error.

### Audit events

Use the authenticated server-resolved user ID. Record:

- feature
- status
- latency
- provider/model metadata
- token metadata when available
- request ID
- trace ID
- normalized error category
- `metadata.fallback_used` when a fallback response is returned

Do not record:

- authorization headers
- API keys
- raw provider response bodies
- full prompts by default
- private message content
- unnecessary photo or profile data

If the provider fails but the route returns a graceful fallback, record:

- `status = 'failure'`
- `metadata.fallback_used = true`
- a normalized error category

Do not record raw provider error text in `error_code`.

### Normalized error categories

Use only controlled categories such as:

- `AUTHENTICATION_FAILED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_UNAVAILABLE`
- `PROVIDER_BAD_RESPONSE`
- `VALIDATION_FAILED`
- `REQUEST_TOO_LARGE`
- `POC_DISABLED`

### Service-role isolation

- The role key may be imported only by server modules.
- Client components must not import `server.ts` or `audit-auditing.ts`.
- No service-role value may appear in client bundles.
- Audit insertion must not be callable directly from browser code.

## Production controls

Keep these controls in place:

- `GETWINK_MASTRA_POC_ENABLED` false or unset in production.
- No public Mastra Studio.
- No unauthenticated Mastra endpoint.
- No live AI discovery ranking.
- No automatic message sending.
- No irreversible safety enforcement based solely on AI output.
