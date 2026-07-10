/**
 * Privacy Boundary for GetWink Mastra AI POC.
 * Enforces a strict allowlist projection on any data passed to or from the LLM,
 * and redacts sensitive patterns (emails, phone numbers, auth tokens).
 */

export interface PublicCandidate {
  candidateId: string;
  displayName: string;
  bio: string;
  visibleInterests: string[];
  city?: string;
}

/**
 * Pre-processes a candidate object to yield ONLY allowlisted public fields.
 * Explicitly strips out internal identifiers, email, phone, block/report status,
 * moderation notes, subscription data, etc.
 */
export function projectPublicCandidate(rawCandidate: Record<string, any>): PublicCandidate {
  return {
    candidateId: String(rawCandidate.candidateId || ''),
    displayName: String(rawCandidate.displayName || ''),
    bio: sanitizeText(String(rawCandidate.bio || '')),
    visibleInterests: Array.isArray(rawCandidate.visibleInterests)
      ? rawCandidate.visibleInterests.map((i: any) => sanitizeText(String(i)))
      : [],
    city: rawCandidate.city ? String(rawCandidate.city) : undefined,
  };
}

/**
 * Sanitizes input text by redacting common sensitive patterns:
 * - Emails
 * - Phone numbers (various formats)
 * - Bearer tokens or credential strings
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // 1. Redact emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitized = sanitized.replace(emailRegex, '<email-redacted>');

  // 2. Redact phone numbers (simple international/local formats)
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  sanitized = sanitized.replace(phoneRegex, '<phone-redacted>');

  // 3. Redact authorization / secret tokens
  const tokenRegex = /(bearer|token|sk-[a-zA-Z0-9]{20,})/gi;
  sanitized = sanitized.replace(tokenRegex, '<credential-redacted>');

  return sanitized;
}
