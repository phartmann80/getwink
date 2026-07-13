# Patch 002C Test Matrix

| Check | Expected result |
|---|---|
| TypeScript check | Passes normally |
| Next.js build | Passes normally, no ignore flags |
| `GET /api/health` | HTTP 200 JSON with `ok: true` |
| Health content type | `application/json` |
| Health cache policy | `no-store` or equivalent |
| Health response privacy | No env/provider/database details |
| `POST /api/health` | Safe method response; no AI execution |
| Unauthenticated AI request | Rejected according to route contract |
| Production POC flag | False/unset |
| APK configured and reachable | CTA links to it |
| APK unavailable | CTA disabled/status message; no 404 link |
| Client bundle secret scan | Passes |
| Vercel preview | Ready without build bypasses |
| Production deployment | Ready without build bypasses |
| Canonical domain | `https://www.getwink.app` |
| Apex redirect | `https://getwink.app` redirects to canonical host |
