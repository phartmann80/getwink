# Patch 002B Hardening Test Matrix

The team must run and record each test.

| Test | Expected result |
|---|---|
| Missing authentication | HTTP 401; `AUTHENTICATION_FAILED` |
| Malformed bearer token | HTTP 401; no raw token in response/logs |
| Expired bearer token | HTTP 401 |
| Valid bearer token | Authenticated user ID is server-derived |
| Valid cookie session | Authenticated user ID is server-derived |
| Client user ID spoofing | Ignored; audit uses verified session ID |
| Deleted/suspended user | Rejected according to account policy |
| Declared body > 100 KB | HTTP 413; `REQUEST_TOO_LARGE` |
| Missing Content-Length, actual body > 100 KB | HTTP 413; no unbounded JSON parse |
| Malformed JSON under limit | HTTP 400; safe error |
| Provider timeout | Safe response; audit failure + `fallback_used=true` |
| Provider 4xx/5xx | Safe response; normalized error category |
| Malformed AI output | Validation failure; deterministic fallback |
| Successful AI response | Audit success; no private prompt content logged |
| Authenticated client INSERT to `ai_usage_events` | Denied by database permissions |
| Authenticated client UPDATE to `ai_usage_events` | Denied by database permissions |
| Authenticated client DELETE to `ai_usage_events` | Denied by database permissions |
| Service-side audit INSERT | Succeeds using server-only role client |
| Trace redaction | Tokens, authorization values, and raw private content excluded |
| Client bundle scan | No service-role key, Langdock key, or role key |
| Production POC flag unset | Mastra POC route disabled |
