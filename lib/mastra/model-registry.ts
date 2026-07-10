/**
 * Relationship between GetWink AI Service and Mastra:
 *
 * Current production path:
 *   GetWink AI service (lib/ai/ai-service.ts)
 *     -> LangdockAiProvider (lib/ai/langdock-provider.ts)
 *       -> Fetch request against LANGDOCK_ENDPOINT_URL
 *
 * Mastra integration path (Patch 002A POC):
 *   Mastra Agents / Workflows (src/mastra/)
 *     -> Model Registry (lib/mastra/model-registry.ts)
 *       -> Custom OpenAI-compatible model config (pointing to LANGDOCK_ENDPOINT_URL & LANGDOCK_API_CODE)
 *         -> Langdock OpenAI-compatible endpoint
 *
 * Relationship:
 * The existing AI service (lib/ai/ai-service.ts) remains canonical for non-agentic chat
 * completion and user assistant routes. Mastra is used exclusively for structured, multi-step
 * reasoning tasks (like profile assistant and discovery recommendation workflows). Both paths
 * share the same underlying LLM provider credentials and endpoint.
 */

const endpointUrl = process.env.LANGDOCK_ENDPOINT_URL?.trim();
const apiCode = process.env.LANGDOCK_API_CODE?.trim();

// Task-level model configurations
export const MODELS = {
  profileAssistant: process.env.GETWINK_MASTRA_MODEL_PROFILE || process.env.MODEL || 'gpt-5.1',
  discoveryRanking: process.env.GETWINK_MASTRA_MODEL_DISCOVERY || process.env.MODEL || 'gpt-5.1',
  evalModel: process.env.GETWINK_MASTRA_MODEL_EVAL || process.env.MODEL || 'gpt-5.1',
};

/**
 * Returns the configured model config object for the specific task.
 * Returns a type-compatible Mastra model configuration to avoid provider version mismatch.
 */
export function getModelForTask(task: keyof typeof MODELS) {
  const modelId = MODELS[task];
  return {
    id: `openai/${modelId}` as `${string}/${string}`,
    url: endpointUrl || 'https://api.langdock.com/openai/eu/v1',
    apiKey: apiCode || 'mock-api-key',
  };
}
