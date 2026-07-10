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
    [key: string]: any;
  };
}

/**
 * Normalizes internal errors into client-safe production responses without leaking keys or credentials.
 */
export function normalizeError(err: any): { category: string; message: string; status: number } {
  const errMsg = err instanceof Error ? err.message : String(err);
  const errMsgLower = errMsg.toLowerCase();

  if (
    errMsgLower.includes('no authorization token found') ||
    errMsgLower.includes('invalid token') ||
    errMsgLower.includes('expired user session') ||
    errMsgLower.includes('unauthorized') ||
    errMsgLower.includes('jwt')
  ) {
    return {
      category: 'unauthorized',
      message: 'Authentication is required.',
      status: 401,
    };
  }

  if (errMsgLower.includes('forbidden') || errMsgLower.includes('unauthorized feature') || errMsgLower.includes('role')) {
    return {
      category: 'forbidden',
      message: 'You are not authorized to access this feature.',
      status: 403,
    };
  }

  if (errMsgLower.includes('payload too large')) {
    return {
      category: 'invalid_input',
      message: 'Invalid request payload. Payload too large.',
      status: 413,
    };
  }

  if (
    errMsgLower.includes('payload too large') ||
    errMsgLower.includes('messages must be an array') ||
    errMsgLower.includes('invalid ai message') ||
    errMsgLower.includes('missing') ||
    errMsgLower.includes('invalid')
  ) {
    return {
      category: 'invalid_input',
      message: 'Invalid request payload.',
      status: 400,
    };
  }

  if (
    errMsgLower.includes('timeout') ||
    errMsgLower.includes('deadline') ||
    errMsgLower.includes('504') ||
    errMsgLower.includes('abort')
  ) {
    return {
      category: 'timeout',
      message: 'AI assistant took too long to respond. Please try again.',
      status: 504,
    };
  }

  if (
    errMsgLower.includes('api') ||
    errMsgLower.includes('provider') ||
    errMsgLower.includes('status 40') ||
    errMsgLower.includes('status 50') ||
    errMsgLower.includes('unauthorized API key') ||
    errMsgLower.includes('internal server error') ||
    errMsgLower.includes('apicallerror') ||
    errMsgLower.includes('500') ||
    errMsgLower.includes('502') ||
    errMsgLower.includes('503')
  ) {
    return {
      category: 'provider_error',
      message: 'AI assistant is unavailable right now.',
      status: 502,
    };
  }

  return {
    category: 'unknown_error',
    message: 'AI assistant is unavailable right now.',
    status: 500,
  };
}

/**
 * Audit log insertion inside the PostgreSQL database using a service-role client.
 * Strictly guarantees that RLS is bypassed for the insert command but uses validated server-side parameters.
 */
export async function auditAiUsage(event: AuditAiEvent): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Map properties to supabase columns
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
  } catch (err: any) {
    console.error('[AUDITING ERROR] Critical failed to insert audit usage:', err.message);
  }
}
