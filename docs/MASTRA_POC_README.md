# Mastra AI POC README

This directory contains the Mastra AI Profile and Discovery Proof of Concept (POC) setup for GetWink.

## 1. What was Added
- **Schemas**: `src/mastra/schemas/` containing output shapes for profile improvements and candidate rankings.
- **Agents**: `profileAssistantAgent` (constructive guidance, safety guarded) and `discoveryInterestAgent` (interest matching, tool enabled).
- **Workflows**: `profileAssistanceWorkflow` and `discoveryRecommendationsWorkflow` executing sequential agentic checks.
- **Tools**: `getControlledCandidatePool` providing allowlist projection of candidate profiles.
- **Registry**: `lib/mastra/model-registry.ts` mapping task-level model selections and custom OpenAI adapters.
- **Telemetry Safeguards**: `lib/mastra/privacy-boundary.ts` and `lib/mastra/trace-redaction.ts` filtering PII, credentials, and internal fields.
- **Runner**: `lib/mastra/run-mastra-poc.ts` node executable for running synthetic fixtures.

## 2. Installation
To install the new dependencies locally:
```bash
npm install
```

This will load `@mastra/core`, `@mastra/memory`, `@mastra/observability`, `@mastra/evals`, `@mastra/libsql`, `@ai-sdk/openai`, `zod`, and `tsx` (for CLI execution).

## 3. Environment Configuration
Create or configure `.env.local` at the project root:
- `LANGDOCK_ENDPOINT_URL`: The OpenAI-compatible base URL.
- `LANGDOCK_API_CODE`: The provider authentication key.
- `MODEL`: Default model identifier (e.g., `gpt-5.1` or `gpt-5.2`).
- `GETWINK_MASTRA_POC_ENABLED=true`
- `GETWINK_MASTRA_MODEL_PROFILE`: (Optional) task-specific model ID.
- `GETWINK_MASTRA_MODEL_DISCOVERY`: (Optional) task-specific model ID.
- `GETWINK_MASTRA_MODEL_EVAL`: (Optional) task-specific model ID.

*Values in logs and documentation must remain redacted or set to `<configured>`.*

## 4. Running the POC & Fixtures
Execute the test runner script using `tsx`:
```bash
npx tsx lib/mastra/run-mastra-poc.ts
```

This script executes:
1. **Privacy Boundary & Redaction Tests**: Verifies PII (email, phone, block status, internal flags) is projected and stripped.
2. **Existing AI service verification**: Confirms legacy routes and abstractions function without regression.
3. **Profile Fixtures**: Runs incomplete, generic, and strong profile cases.
4. **Discovery Fixtures**: Runs candidate matching, checks score constraints [0,1], runs prompt-injection defenses, and verifies deduplication.
5. **Model Comparisons**: Automatically evaluates outputs across primary and secondary models and outputs results to `docs/MASTRA_MODEL_COMPARISON.md`.

## 5. Traces and Inspection
- Logger outputs execution trace details to standard output during testing.
- Local sqlite files/LibSQL database created in memory is used strictly as local cache for POC execution.
- Observability scrubbing runs automatically on the metadata payloads to prevent keys or raw secrets from printing in standard logs.

## 6. Known Limitations
- Vercel hosting does not support persistent filesystems; hence trace file logging is disabled for production.
- If only one model was tested, the fallback configuration or endpoint limit restricted access to secondary models.
- Estimated costs and exact token counts might be unavailable depending on the provider payload structure.

## 7. Next Recommended Steps
Proceed to **Patch 002B**:
- Integrate authenticated routes.
- Implement Supabase token checking and identity validation.
- Implement AI usage audit trail logging (`ai_usage_events`).
