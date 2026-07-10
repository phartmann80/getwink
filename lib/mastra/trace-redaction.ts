import { sanitizeText } from './privacy-boundary';

/**
 * Trace Redaction Boundary for Mastra AI Observability.
 * 
 * NOTE ON STORAGE CONFIGURATION:
 * - Local LibSQL/file-backed storage is approved ONLY for local POC testing.
 * - This must NEVER be used as the production Vercel persistence strategy since Vercel serverless
 *   filesystems are ephemeral.
 */

export interface SafeTraceMetadata {
  traceId: string;
  agentId?: string;
  workflowId?: string;
  toolId?: string;
  modelId?: string;
  status: 'success' | 'failed' | 'running';
  latencyMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  errorCategory?: string;
}

/**
 * Scrubs any sensitive tracing inputs/outputs before logging or sending to observability exporters.
 * Deletes authentication headers, API keys, and scrubs potential PII from texts.
 */
export function redactTracePayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const jsonString = JSON.stringify(payload);
  
  // Replace sensitive keys or content structures
  const scrubbedString = jsonString.replace(
    /"(apiKey|apiCode|authorization|token|password|email|phone)":\s*"[^"]*"/gi,
    (match, key) => `"${key}":"<redacted-sensitive-key>"`
  );

  const parsed = JSON.parse(scrubbedString);
  return deepScrub(parsed);
}

function deepScrub(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(deepScrub);
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Exclude known internal database keys or moderation notes completely
      if (['moderationNotes', 'rawDbRow', 'privateMessage', 'sessionToken'].includes(key)) {
        scrubbed[key] = '<redacted-internal-field>';
      } else if (typeof obj[key] === 'string') {
        scrubbed[key] = sanitizeText(obj[key]);
      } else {
        scrubbed[key] = deepScrub(obj[key]);
      }
    }
    return scrubbed;
  }

  return obj;
}
