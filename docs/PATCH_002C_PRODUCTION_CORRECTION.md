# GetWink Patch 002C — Production Build and Health Correction

## Why this patch is required

Production verification found two release blockers after Patch 002B deployment:

1. `https://www.getwink.app/api/health` returns `{"error":"Unsupported content-type"}` instead of the expected health response.
2. Vercel production was redeployed with TypeScript/ESLint build-error ignoring after an initial build failure.

A third beta-readiness issue was also verified:

3. `https://getwink.app/download/beta.apk` currently returns HTTP 404.

Patch 002C restores a fail-closed build, makes the health endpoint deterministic, and prevents the landing page from advertising a broken APK download.

## Required code changes

### 1. Remove build-error bypasses

Remove all production configuration equivalent to:

```ts
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```

The production deployment must only proceed after normal typecheck/build checks pass.

### 2. Isolate the public health route

`GET /api/health` must not run through AI content-type validation or protected route middleware.

Expected response:

```json
{
  "ok": true,
  "service": "getwink",
  "timestamp": "<ISO timestamp>"
}
```

Recommended response headers:

```text
Content-Type: application/json
Cache-Control: no-store
```

The route must not expose environment variables, provider state, database credentials, or detailed diagnostics.

### 3. Fix middleware scope

If middleware currently intercepts `/api/health`, exclude the route explicitly. Authentication/content-type checks should apply only to the intended protected AI routes.

### 4. Handle unavailable APK safely

The configured APK URL currently returns 404. Until a real APK exists, the landing page must not present a working-download claim.

Recommended behavior:

- If `NEXT_PUBLIC_ANDROID_APK_URL` is a validated real URL, render the download link.
- Otherwise render a disabled `Android beta coming soon` control or beta-access status message.
- Do not link to a known 404 placeholder.

Once the APK is built, upload it to a stable location and restore the download CTA using configuration only.

## Required tests

- `npm run typecheck` succeeds.
- `npm run build` succeeds without ignore flags.
- `GET /api/health` returns HTTP 200 JSON.
- `POST /api/health` does not accidentally invoke AI logic.
- `GET /api/ai/chat` remains protected/unsupported as designed.
- An unauthenticated AI POST remains rejected.
- Landing page does not link to a 404 APK.
- No secrets occur in client bundles.
- Vercel preview deploy succeeds without bypasses.
- Production deploy succeeds without bypasses.
