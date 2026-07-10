# Mastra AI Integration Plan

This document details the architectural decisions, design limits, and roadmap for embedding the Mastra AI framework inside the GetWink Next.js TypeScript codebase.

## 1. Architectural Strategy
GetWink integrates Mastra AI directly into the main Next.js repository rather than introducing an external FastAPI or Python service. This keeps the deployment simple, maintains a unified TypeScript type system, and allows direct server-side imports inside Next.js API routes or Server Actions.
- **Embedded in Next.js**: Mastra is configured server-side and will run within Vercel serverless functions.
- **Future Scale**: If background execution queues, complex agent loops, or memory databases require persistent processes, Mastra execution can be decomposed into a separate microservice. For the beta milestone, embedding is the authoritative, lightweight choice.

## 2. Dependency List & Versions
The following npm packages are introduced:
- `@mastra/core`: Core agentic framework orchestration.
- `@mastra/memory`: Handles semantic storage and conversation contexts.
- `@mastra/observability`: Integrates telemetry and structured log hooks.
- `@mastra/evals`: Evaluates agent responses using assertions/scorers.
- `@mastra/libsql`: In-memory storage adapter for local testing.
- `@ai-sdk/openai`: Adapts OpenAI-compatible endpoints to Vercel AI SDK standards.
- `zod`: Type safety and structured JSON validation.

## 3. Data Flow & Deterministic Boundary
To preserve security, determinism, and RLS policies:
1. **Authentication & Core Logic**: Remains completely deterministic, outside the LLM. Block lists, geographical constraints, age rules, active passes/winks, match creation, and reports are handled by core TypeScript code and Supabase Postgres RLS policies.
2. ** Allowlist Projection**: The Mastra candidate pool tool `getControlledCandidatePool` extracts only public profile metadata (ID, display name, public bio, visible interests, city). Hidden profile fields, subscription status, block lists, reports, emails, phone numbers, and moderation notes are strictly withheld.
3. **Structured Verification**: Agent responses are parsed against strict Zod schemas. If the agent invents candidate IDs, returns duplicate candidates, or fails JSON parsing, the system immediately catches the validation error, falls back to the original deterministic ordering, and records a safe telemetry category.

## 4. Privacy & Telemetry Limits
- **Scrubbing**: Observability trace exporter runs a deep-redaction pass to delete authorization tokens, credentials, keys, database rows, or internal moderation logs.
- **Ephemeral Storage**: Local file-backed storage (LibSQL) is used for POC runs only. It is explicitly marked as non-persistent and will NOT be used for Vercel production hosting (where execution environments are ephemeral).

## 5. Roadmap
- **Patch 002A**: Synthetic proof-of-concept runner, schema validation, safety assertion checks, and compatibility smoke test. No database migrations, no live ranking, and no public endpoints.
- **Patch 002B**: Authentication wrapper routing, Supabase identity propagation, `ai_usage_events` logging, timeouts, and shadow-mode telemetry.
