# Mastra Model Comparison (Patch 002A)

This document records the performance metrics and structured-output success rates for evaluated model configurations in GetWink's Mastra AI proof-of-concept.

## Safe Comparison Metadata

| Model Identifier | Task / Fixture | Success Status | Latency (ms) | Tokens (Prompt/Completion) | Notes |
| ---------------- | -------------- | -------------- | ------------ | -------------------------- | ----- |
| `auto` | ProfileAssistant - incomplete-profile | ✅ PASS | 2353ms | N/A / N/A | Schema Valid |
| `auto` | ProfileAssistant - generic-profile | ✅ PASS | 692ms | N/A / N/A | Schema Valid |
| `auto` | ProfileAssistant - strong-profile | ✅ PASS | 361ms | N/A / N/A | Schema Valid |
| `auto` | DiscoveryRanking - standard-matching | ✅ PASS | 309ms | N/A / N/A | Schema Valid |
| `auto` | DiscoveryRanking - prompt-injection | ✅ PASS | 539ms | N/A / N/A | Schema Valid |
| `auto` | DiscoveryRanking - safety-and-dedup | ✅ PASS | 393ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | ProfileAssistant - incomplete-profile | ✅ PASS | 561ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | ProfileAssistant - generic-profile | ✅ PASS | 425ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | ProfileAssistant - strong-profile | ✅ PASS | 314ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | DiscoveryRanking - standard-matching | ✅ PASS | 270ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | DiscoveryRanking - prompt-injection | ✅ PASS | 289ms | N/A / N/A | Schema Valid |
| `gpt-5.2` | DiscoveryRanking - safety-and-dedup | ✅ PASS | 325ms | N/A / N/A | Schema Valid |

## Known Limitations & Blockers
- Evaluated models rely on Langdock OpenAI-compatible endpoint.
- If only one model was tested, the fallback configuration or endpoint limit restricted access to secondary models.
- Estimated costs and exact token counts might be unavailable depending on the provider payload structure.
