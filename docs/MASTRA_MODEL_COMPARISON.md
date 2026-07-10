# Mastra Model Comparison (Patch 002A Corrective Verification)

This document records the performance metrics and structured-output success rates for evaluated model configurations in GetWink's Mastra AI proof-of-concept.

## Corrective Test Execution Summary

| Test Case / Condition | Scenario Type | Expected Behavior | Actual Status | Details |
| --------------------- | ------------- | ----------------- | ------------- | ------- |
| Normalize: https://api.langdock.com/openai/eu/v1 | `url-normalization` | Output: https://api.langdock.com/openai/eu/v1/chat/completions | **PASSED** | Output: https://api.langdock.com/openai/eu/v1/chat/completions |
| Normalize: https://api.langdock.com/openai/eu/v1/ | `url-normalization` | Output: https://api.langdock.com/openai/eu/v1/chat/completions | **PASSED** | Output: https://api.langdock.com/openai/eu/v1/chat/completions |
| Normalize: https://api.langdock.com/openai/eu/v1/chat/completions | `url-normalization` | Output: https://api.langdock.com/openai/eu/v1/chat/completions | **PASSED** | Output: https://api.langdock.com/openai/eu/v1/chat/completions |
| Normalize: https://api.langdock.com/openai/eu/v1/chat/completions/ | `url-normalization` | Output: https://api.langdock.com/openai/eu/v1/chat/completions | **FAILED** | Output: https://api.langdock.com/openai/eu/v1/chat/completions/chat/completions |
| Profile Assistant - incomplete-profile | `fake-model-success` | Completes with structured output validating schemas & bounds | **PASSED** | Matched Zod schema structure |
| Profile Assistant - generic-profile | `fake-model-success` | Completes with structured output validating schemas & bounds | **FAILED** | Issues: Expected completeness: true, got: false |
| Profile Assistant - strong-profile | `fake-model-success` | Completes with structured output validating schemas & bounds | **FAILED** | Issues: Expected completeness: true, got: false, bioDraft was explicitly requested but returned empty/null |
| Discovery Agent - standard-matching | `fake-model-success` | Ranks candidates with valid scores & confidence | **PASSED** | Sorted and matching IDs |
| Malformed output handling | `fallback-behavior` | Intercepts parser error and returns valid fallback feedback | **PASSED** | Returned completeness: false |
| Unknown candidate ID rejection | `fallback-behavior` | Rejects ranking containing invented IDs and activates fallback | **PASSED** | Explanations: "Safely fell back to original deterministic order due to processing error." |
| Duplicate candidate ID rejection | `fallback-behavior` | Rejects duplicates and activates fallback | **PASSED** | First ranked candidate ID: candidate-001 |
| Interest score bounds verification | `fallback-behavior` | Rejects scores > 1 and falls back | **PASSED** | Fallback score returned: 0.5 |
| Confidence score bounds verification | `fallback-behavior` | Rejects confidence < 0 and falls back | **PASSED** | Fallback confidence returned: 0 |
| Provider timeout handling | `fallback-behavior` | Triggers safety fallback on connection timeout | **PASSED** | Status: success |
| Provider non-2xx status handling | `fallback-behavior` | Triggers safety fallback on provider error responses | **PASSED** | Status: success |
| Deterministic fallback ordering | `fallback-behavior` | Preserves original caller eligibility ordering in fallback | **PASSED** | Original: ["candidate-001","candidate-002"], Fallback: ["candidate-001","candidate-002"] |
| Prompt-injection defense | `injection-defense` | Shields from instructions embedded in candidate profiles | **PASSED** | Inj ID Returned: false |
| Privacy allowlist stripping | `privacy-boundary` | Filters unexpected fields prior to LLM submission without fallback | **PASSED** | Eval results: PASSED |

## Safe Model Execution Configuration & Status

| Model Identifier | provider/model request | live model execution | fallback execution | model quality comparison |
| ---------------- | ---------------------- | -------------------- | ------------------ | ------------------------ |
| `auto` | attempted | **FAILED** (unauthorized API key) | **PASSED** | not available |
| `gpt-5.2` | attempted | **FAILED** (unauthorized API key) | **PASSED** | not available |

## Known Limitations & Blockers
- **API Key Validity**: The Langdock API key configured in `.env.local` is invalid/expired (returns `401 Unauthorized`).
- **Live Performance**: Due to the credential failure, live latency, cost, and token metrics are not available and are not reported as model performance.
- **Offline Success Path**: Verified successfully using the fake-model test adapter.
