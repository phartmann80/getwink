import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { auditAiUsage, normalizeError, AI_FEATURES } from '@/lib/mastra/audit-auditing';
import { mastra } from '@/src/mastra';
import crypto from 'crypto';

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let userId: string | undefined;
  let feature: string = 'general_assistant';
  let traceId: string | undefined;
  let providerName = 'openai';
  let modelName = 'gpt-5.1';

  try {
    // 1. Enforce payload size limits (max 100 KB)
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > 100 * 1024) {
        throw new Error('Payload too large');
      }
    }

    // 2. Validate Supabase session server-side
    const user = await getAuthenticatedUser(request);
    userId = user.id;

    // 3. Verify POC flag is enabled
    if (process.env.GETWINK_MASTRA_POC_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Mastra AI POC is disabled.' },
        { status: 503 }
      );
    }

    // Read and parse request body
    const body = await request.json();
    feature = body.feature || 'general_assistant';

    // 4. Validate feature parameter
    if (!AI_FEATURES.includes(feature as any)) {
      throw new Error(`invalid feature: ${feature}`);
    }

    // 5. Validate messages structure
    const messages = validateMessages(body.messages);
    const conversationId = body.conversationId;

    // 6. Run execution with request timeout (5s)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    const executionPromise = (async () => {
      if (feature === 'bio_improvement' || feature === 'profile_creation') {
        // Run profile assistance workflow
        const workflow = mastra.getWorkflow('profileAssistance');
        const run = await workflow.createRunAsync();
        traceId = run.runId;
        const workflowResult = await run.start({
          inputData: {
            profile: {
              bio: messages[messages.length - 1]?.content || '',
              username: 'User',
              gender: 'other',
              interests: [],
              photos: [],
            },
            requestBioDraft: feature === 'bio_improvement',
          },
        });

        if (workflowResult.status === 'success') {
          return {
            content: JSON.stringify(workflowResult.result),
            usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
          };
        } else if (workflowResult.status === 'failed') {
          throw workflowResult.error || new Error('Workflow execution failed');
        } else {
          throw new Error(`Workflow execution was suspended: ${workflowResult.status}`);
        }
      } else {
        // Run profile assistant agent for general queries
        const agent = mastra.getAgent('profileAssistant');
        const agentResult = await agent.generate(
          `User request for feature ${feature}. Messages:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
        );
        // Trace ID in agent generation
        traceId = undefined;
        return {
          content: agentResult.text,
          usage: {
            promptTokens: (agentResult.usage as any)?.promptTokens || 0,
            completionTokens: (agentResult.usage as any)?.completionTokens || 0,
            totalTokens: (agentResult.usage as any)?.totalTokens || 0,
          },
        };
      }
    })();

    const response = await Promise.race([executionPromise, timeoutPromise]);

    // 7. Success Audit Logging
    await auditAiUsage({
      userId,
      conversationId,
      feature,
      status: 'success',
      latencyMs: Date.now() - startedAt,
      provider: providerName,
      model: modelName,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      metadata: {
        requestId,
        traceId,
      },
    });

    return NextResponse.json({
      content: response.content,
      usage: {
        provider: providerName,
        model: modelName,
      },
    });

  } catch (error: any) {
    // 8. Error Normalization and Redaction
    const normalized = normalizeError(error);
    
    // Fail audit logging
    if (userId) {
      await auditAiUsage({
        userId,
        feature,
        status: 'failure',
        latencyMs: Date.now() - startedAt,
        errorCode: normalized.category,
        metadata: {
          requestId,
          traceId,
          errorCategory: normalized.category,
          internalMessage: error.message || String(error),
        },
      }).catch((e) => console.error('[AUDIT FAILED]', e));
    }

    return NextResponse.json(
      { error: normalized.message },
      { status: normalized.status }
    );
  }
}

function validateMessages(value: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(value)) {
    throw new Error('messages must be an array');
  }
  return value.map((message) => {
    if (
      !message ||
      typeof message !== 'object' ||
      !['user', 'assistant'].includes((message as any).role) ||
      typeof (message as any).content !== 'string'
    ) {
      throw new Error('invalid AI message');
    }
    return {
      role: (message as any).role,
      content: (message as any).content,
    };
  });
}
