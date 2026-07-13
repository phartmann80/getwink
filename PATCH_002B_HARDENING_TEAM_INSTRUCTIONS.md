# GetWink Patch 002B Hardening — Team Instructions

This ZIP is the complete corrective package for the remaining Patch 002B review items.

## Base

Apply on top of:

- Branch: `patch-002b-mastra-auth-auditing`
- Commit: `0108eab4ab973a12f4120ad1d84e568909b60ee6`

## Included files

- `supabase/migrations/0002_restrict_ai_usage_event_inserts.sql`
- `supabase/verification/0002_verify_ai_usage_event_permissions.sql`
- `docs/PATCH_002B_HARDENING.md`
- `docs/PATCH_002B_TEST_MATRIX.md`
- this instruction file

## No new npm dependencies

Do not install new packages for this correction unless the existing implementation genuinely requires one. Do not remove existing packages.

## Apply the patch

1. Create a new branch from the existing Patch 002B branch:

```text
git checkout patch-002b-mastra-auth-auditing
git checkout -b patch-002b-hardening
```

2. Copy the contents of the inner `getwink-patch-002b-hardening` folder into the repository root.

3. Keep `.env.local` and all secrets outside Git.

4. Apply the included migration to the correct GetWink Supabase project:

```text
supabase/migrations/0002_restrict_ai_usage_event_inserts.sql
```

Use the team’s approved Supabase SQL editor or migration process. Do not print or commit the database password.

5. Update the existing Patch 002B application code according to `docs/PATCH_002B_HARDENING.md`:

- enforce actual request-body byte limits;
- verify bearer and cookie sessions server-side;
- use only the verified session user ID;
- set `fallback_used=true` for graceful provider fallbacks;
- use normalized error categories;
- keep the service-role client server-only.

6. Run the verification SQL file:

```text
supabase/verification/0002_verify_ai_usage_event_permissions.sql
```

Expected database result:

- authenticated INSERT is not granted;
- authenticated UPDATE is not granted;
- authenticated DELETE is not granted;
- own-row SELECT may remain if required;
- server-side service-role insertion remains available.

## Required tests

Run the existing root checks:

```text
npm run typecheck
npm run build
```

Run the existing health check:

```text
GET /api/health
```

Run the existing Mastra auth tests and extend them using:

```text
lib/mastra/run-mastra-auth-tests.ts
```

Use `docs/PATCH_002B_TEST_MATRIX.md` as the required test list.

At minimum, verify:

- missing/malformed/expired authentication;
- bearer authentication;
- cookie authentication;
- user ID spoofing;
- declared and actual request-body limits;
- provider timeout and 4xx/5xx handling;
- fallback audit metadata;
- authenticated audit INSERT/UPDATE/DELETE denial;
- service-side audit INSERT;
- trace redaction;
- client bundle secret scan;
- POC disabled in production.

## Provider status

The last report said the configured provider credential is invalid or expired.

Do not put a replacement key in GitHub, chat, walkthroughs, screenshots, or logs.

If the credential is renewed privately, run a controlled smoke test and report only:

```text
Provider connectivity: passed/failed
Model: <model identifier>
Structured output: passed/failed
Tool calling: passed/failed/not tested
Usage metadata: available/unavailable
Latency: <number>
```

If it is not renewed, document live provider connectivity as blocked. Do not present fallback output as live model output.

## Domain and Vercel

Canonical host:

```text
https://www.getwink.app
```

The apex domain may continue redirecting to the canonical `www` host.

Create a Vercel preview deployment after the build passes. The preview must not expose a public Mastra endpoint or Mastra Studio.

Confirm:

- `GETWINK_MASTRA_POC_ENABLED` is false or unset in production;
- Supabase role key is not in client bundles;
- Langdock key is not in client bundles;
- no unauthenticated Mastra route is available.

## Documentation

Update `walkthrough.md` with:

- files changed;
- migration applied and verification result;
- authentication tests;
- request-body limit tests;
- audit permission tests;
- fallback audit behavior;
- normalized error categories;
- provider status;
- build and health results;
- Vercel preview URL;
- commit hash;
- push status;
- blockers;
- next task.

Use `<configured>` instead of secret values.

## Commit and push

Use this commit message:

```text
Patch 002B: harden AI audit permissions and request authentication
```

Push the new branch and open a PR into `patch-002b-mastra-auth-auditing`.

Do not merge until the migration, tests, walkthrough, and preview verification are complete.

## Final acceptance gate

Patch 002B hardening is complete only when:

- the new migration is applied;
- authenticated client audit writes are denied;
- service-side audit writes work;
- actual body size is capped;
- bearer and cookie sessions are verified;
- fallbacks are audited as provider failures;
- error categories are normalized;
- tests pass;
- no secrets appear in client bundles or logs;
- the walkthrough is complete;
- the Vercel preview is verified;
- live AI discovery remains disabled.
