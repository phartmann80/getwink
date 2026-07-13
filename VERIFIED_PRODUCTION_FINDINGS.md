# Independently verified production findings

Verified on 2026-07-13:

- `https://www.getwink.app/` resolves and renders the GetWink landing page.
- `https://www.getwink.app/privacy` resolves.
- `https://www.getwink.app/terms` resolves.
- `https://www.getwink.app/safety` resolves.
- `https://www.getwink.app/api/health` returns `{"error":"Unsupported content-type"}` and therefore fails the expected health contract.
- `https://getwink.app/download/beta.apk` returns HTTP 404.

The developer report also states that Vercel production was redeployed with build-error ignoring after an initial build failure. This is not accepted as a production-quality build and must be corrected.
