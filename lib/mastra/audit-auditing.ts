import { createSupabaseServiceRoleClient } from '../supabase/server';

export const AI_FEATURES = [
  'general_assistant',
  'onboarding_guidance',
  'profile_creation',
  'bio_improvement',
  'conversation_opener',
  'reply_suggestion',
  'safety_guidance',
  'reporting_support',
] as const;

export type AiFeature = typeof AI_FEATURES[number];

export interface AuditAiEvent {
  userId: string;
  conversationId?: string;
  feature: string;
  status: 'success' | 'failure';
  latencyMs: number;
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorCode?: string;
  metadata?: {
    requestId?: string;
    traceId?: string;
    errorCategory?: string;
    fallback_used?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Normalizes internal errors into controlled client-safe categories without leaking credentials.
 */
export function normalizeError(err: unknown): { category: string; message: string; status: number } {
  const errMsg = err instanceof Error ? err.message : String(err);
  const errMsgLower = errMsg.toLowerCase();

  // 1. Payload size limits
  if (errMsgLower.includes('payload_too_large') || errMsgLower.includes('payload too large')) {
    return {
      category: 'REQUEST_TOO_LARGE',
      message: 'Invalid request payload. Request too large.',
      status: 413,
    };
  }

  // 2. Authentication failures
  if (
    errMsgLower.includes('no authorization token found') ||
    errMsgLower.includes('invalid token') ||
    errMsgLower.includes('expired user session') ||
    errMsgLower.includes('unauthorized') ||
    errMsgLower.includes('jwt') ||
    errMsgLower.includes('suspended_account') ||
    errMsgLower.includes('deleted_account') ||
    errMsgLower.includes('authentication')
  ) {
    return {
      category: 'AUTHENTICATION_FAILED',
      message: 'Authentication is required.',
      status: 401,
    };
  }

  // 3. Authorization / entitlment / role limits
  if (
    errMsgLower.includes('forbidden') ||
    errMsgLower.includes('unauthorized feature') ||
    errMsgLower.includes('role')
  ) {
    return {
      category: 'VALIDATION_FAILED',
      message: 'You are not authorized to access this feature.',
      status: 403,
    };
  }

  // 4. Invalid feature or messages input
  if (
    errMsgLower.includes('messages must be an array') ||
    errMsgLower.includes('invalid ai message') ||
    errMsgLower.includes('invalid') ||
    errMsgLower.includes('missing') ||
    errMsgLower.includes('invalid_json') ||
    errMsgLower.includes('feature')
  ) {
    return {
      category: 'VALIDATION_FAILED',
      message: 'Invalid request payload.',
      status: 400,
    };
  }

  // 5. Provider Timeout
  if (
    errMsgLower.includes('timeout') ||
    errMsgLower.includes('deadline') ||
    errMsgLower.includes('504') ||
    errMsgLower.includes('abort')
  ) {
    return {
      category: 'PROVIDER_TIMEOUT',
      message: 'AI assistant took too long to respond. Please try again.',
      status: 504,
    };
  }

  // 6. POC Disabled
  if (
    errMsgLower.includes('poc is disabled') ||
    errMsgLower.includes('poc_disabled')
  ) {
    return {
      category: 'POC_DISABLED',
      message: 'Mastra AI POC is disabled.',
      status: 503,
    };
  }

  // 7. Structured output validation / malformed responses
  if (
    errMsgLower.includes('structured output validation failed') ||
    errMsgLower.includes('bad response') ||
    errMsgLower.includes('malformed')
  ) {
    return {
      category: 'PROVIDER_BAD_RESPONSE',
      message: 'AI assistant returned an invalid response. Please try again.',
      status: 502,
    };
  }

  // Default: Provider unavailable
  return {
    category: 'PROVIDER_UNAVAILABLE',
    message: 'AI assistant is unavailable right now.',
    status: 502,
  };
}

/**
 * Audit log insertion inside the PostgreSQL database using a service-role client.
 * Bypasses RLS utilizing authenticated parameters derived only from server validations.
 */
export async function auditAiUsage(event: AuditAiEvent): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    const payload = {
      user_id: event.userId,
      ai_conversation_id: event.conversationId || null,
      feature: event.feature,
      provider: event.provider || null,
      model: event.model || null,
      status: event.status,
      latency_ms: event.latencyMs,
      prompt_tokens: event.promptTokens || null,
      completion_tokens: event.completionTokens || null,
      total_tokens: event.totalTokens || null,
      error_code: event.errorCode || null,
      metadata: event.metadata || {},
    };

    const { error } = await supabase.from('ai_usage_events').insert(payload);

    if (error) {
      console.error('[AUDITING ERROR] Failed to insert audit event in Database:', error.message);
    }
  } catch (err) {
    console.error('[AUDITING ERROR] Critical failed to insert audit usage:', err instanceof Error ? err.message : String(err));
  }
}
