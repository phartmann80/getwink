# GetWink Patch 001 — Bootstrap Empty Repository

## What this patch contains

- Root Next.js + TypeScript web app for `getwink.app`
- Original GetWink landing page using the provided logo
- Privacy, Terms, and Safety pages
- Health API route
- Server-side AI provider abstraction skeleton for Langdock
- Secure AI chat API route skeleton
- Supabase core MVP migration
- Expo React Native starter app for Android beta under `apps/mobile`
- Vercel config and env example
- Architecture docs and ADR

## Environment variables

Set these in Vercel and local env files:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_ROLE_KEY
LANGDOCK_API_CODE
LANGDOCK_ENDPOINT_URL
MODEL
NEXT_PUBLIC_ANDROID_APK_URL
```

For Expo, set:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=https://getwink.app
```

## Apply steps

1. Unzip patch into the empty repository root.
2. Copy existing secret values into local env; do not commit secrets.
3. Install dependencies with the repo package manager.
4. Run typecheck and production build.
5. Apply `supabase/migrations/0001_getwink_core.sql` to the Supabase project.
6. Commit to branch `patch-001-bootstrap`.
7. Push branch and open PR.
8. After approval, merge to main so Vercel can deploy.

## Smoke tests

- `GET /api/health` returns `{ ok: true }`
- Landing page renders with GetWink logo
- `/privacy`, `/terms`, `/safety` render
- Production build succeeds
- Supabase migration applies without duplicate object errors

## Review gate

Do not promote this to production until:

- Vercel environment variables are configured
- `getwink.app` domain is connected to the Vercel project
- Supabase migration is applied in the target project
- AI route authentication/audit TODOs are completed in Patch 002 before real authenticated beta usage
