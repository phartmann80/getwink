import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load Next.js environment configurations
loadEnvConfig(process.cwd());

import { profileAssistanceWorkflow } from '../../src/mastra/workflows/profile-assistance';
import { discoveryRecommendationsWorkflow } from '../../src/mastra/workflows/discovery-recommendations';
import { PROFILE_FIXTURES, evaluateProfileOutput } from '../../src/mastra/evals/profile-assistant-eval';
import { DISCOVERY_FIXTURES, evaluateDiscoveryOutput } from '../../src/mastra/evals/discovery-ranking-eval';
import { projectPublicCandidate, sanitizeText } from './privacy-boundary';
import { redactTracePayload } from './trace-redaction';
import { AiService } from '../ai/ai-service';
import { MODELS, getModelForTask } from './model-registry';

interface ModelComparisonRecord {
  modelId: string;
  task: string;
  success: boolean;
  latencyMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  error?: string;
}

const comparisonRecords: ModelComparisonRecord[] = [];

async function runProfileAssistantPOC(modelId: string) {
  console.log(`\n========================================`);
  console.log(`Running Profile Assistant POC with Model: ${modelId}`);
  console.log(`========================================`);

  // Dynamically set task model for testing
  process.env.GETWINK_MASTRA_MODEL_PROFILE = modelId;

  for (const fixture of PROFILE_FIXTURES) {
    console.log(`\n--- Fixture: ${fixture.name} ---`);
    const start = Date.now();
    try {
      const run = await profileAssistanceWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          profile: fixture.profile,
          requestBioDraft: fixture.requestBioDraft,
        },
      });

      const latency = Date.now() - start;

      if (result.status === 'success') {
        const output = result.result;
        console.log('Result:', JSON.stringify(output, null, 2));

        const evalResult = evaluateProfileOutput(fixture, output);
        console.log('Eval Passed:', evalResult.passed);
        if (!evalResult.passed) {
          console.warn('Eval Issues:', evalResult.issues);
        }

        comparisonRecords.push({
          modelId,
          task: `ProfileAssistant - ${fixture.id}`,
          success: true,
          latencyMs: latency,
        });
      } else {
        throw new Error(`Workflow execution status: ${result.status}`);
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      console.error(`Fixture ${fixture.id} Failed:`, err.message);
      comparisonRecords.push({
        modelId,
        task: `ProfileAssistant - ${fixture.id}`,
        success: false,
        latencyMs: latency,
        error: err.message,
      });
    }
  }
}

async function runDiscoveryRankingPOC(modelId: string) {
  console.log(`\n========================================`);
  console.log(`Running Discovery Interest Agent POC with Model: ${modelId}`);
  console.log(`========================================`);

  // Dynamically set task model for testing
  process.env.GETWINK_MASTRA_MODEL_DISCOVERY = modelId;

  for (const fixture of DISCOVERY_FIXTURES) {
    console.log(`\n--- Fixture: ${fixture.name} ---`);
    const start = Date.now();
    try {
      const run = await discoveryRecommendationsWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          interestHistory: fixture.interestHistory,
          rawCandidates: fixture.candidates,
        },
      });

      const latency = Date.now() - start;

      if (result.status === 'success') {
        const output = result.result;
        console.log('Result:', JSON.stringify(output, null, 2));

        const evalResult = evaluateDiscoveryOutput(fixture, output);
        console.log('Eval Passed:', evalResult.passed);
        if (!evalResult.passed) {
          console.warn('Eval Issues:', evalResult.issues);
        }

        comparisonRecords.push({
          modelId,
          task: `DiscoveryRanking - ${fixture.id}`,
          success: true,
          latencyMs: latency,
        });
      } else {
        throw new Error(`Workflow execution status: ${result.status}`);
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      console.error(`Fixture ${fixture.id} Failed:`, err.message);
      comparisonRecords.push({
        modelId,
        task: `DiscoveryRanking - ${fixture.id}`,
        success: false,
        latencyMs: latency,
        error: err.message,
      });
    }
  }
}

async function testPrivacyBoundaryAndTraceRedaction() {
  console.log(`\n========================================`);
  console.log(`Testing Privacy Boundary & Trace Redaction`);
  console.log(`========================================`);

  // 1. Test projectPublicCandidate with unexpected fields
  const rawCandidate = {
    candidateId: 'test-user-123',
    displayName: 'Bob',
    bio: 'Contact me at bob@example.com or 555-123-4567.',
    visibleInterests: ['hiking'],
    email: 'private@test.com',
    phoneNumber: '555-555-5555',
    isBlocked: true,
    moderationNotes: 'Do not match.',
  };

  const projected = projectPublicCandidate(rawCandidate);
  console.log('Projected Public Candidate (should only contain public fields & redact emails/phones):');
  console.log(JSON.stringify(projected, null, 2));

  const hasEmail = projected.bio.includes('bob@example.com') || (projected as any).email;
  const hasPhone = projected.bio.includes('555-123-4567') || (projected as any).phoneNumber;
  const hasBlocked = (projected as any).isBlocked !== undefined;

  console.log('Privacy Check Passed:', !hasEmail && !hasPhone && !hasBlocked);

  // 2. Test trace redaction
  const tracePayload = {
    apiKey: 'sk-1234567890abcdef',
    authorization: 'Bearer secret-token',
    metadata: {
      userId: 'user-001',
      privateMessage: 'Hello darling, call me at 123-456-7890.',
      email: 'secret@secret.com',
    },
  };

  const redacted = redactTracePayload(tracePayload);
  console.log('Redacted Trace Payload:');
  console.log(JSON.stringify(redacted, null, 2));

  const isScrubbed =
    !JSON.stringify(redacted).includes('sk-1234567890abcdef') &&
    !JSON.stringify(redacted).includes('secret-token') &&
    !JSON.stringify(redacted).includes('123-456-7890') &&
    !JSON.stringify(redacted).includes('secret@secret.com');

  console.log('Trace Redaction Check Passed:', isScrubbed);
}

async function testExistingAiService() {
  console.log(`\n========================================`);
  console.log(`Testing Existing AI Service Compatibility`);
  console.log(`========================================`);

  try {
    const aiService = new AiService();
    const result = await aiService.generate({
      context: {
        userId: 'test-user-existing',
        feature: 'general_assistant',
      },
      messages: [{ role: 'user', content: 'Say hello and confirm you are online.' }],
    });
    console.log('Existing AiService Response:', result.content);
    console.log('Existing AiService compatibility: OK');
  } catch (err: any) {
    console.error('Existing AiService failed:', err.message);
  }
}

async function writeModelComparisonReport() {
  console.log(`\nGenerating Model Comparison Report...`);

  let report = `# Mastra Model Comparison (Patch 002A)

This document records the performance metrics and structured-output success rates for evaluated model configurations in GetWink's Mastra AI proof-of-concept.

## Safe Comparison Metadata

| Model Identifier | Task / Fixture | Success Status | Latency (ms) | Tokens (Prompt/Completion) | Notes |
| ---------------- | -------------- | -------------- | ------------ | -------------------------- | ----- |
`;

  for (const record of comparisonRecords) {
    report += `| \`${record.modelId}\` | ${record.task} | ${record.success ? '✅ PASS' : '❌ FAIL'} | ${record.latencyMs}ms | ${record.tokensPrompt ?? 'N/A'} / ${record.tokensCompletion ?? 'N/A'} | ${record.error ? `Error: ${record.error}` : 'Schema Valid'} |\n`;
  }

  report += `
## Known Limitations & Blockers
- Evaluated models rely on Langdock OpenAI-compatible endpoint.
- If only one model was tested, the fallback configuration or endpoint limit restricted access to secondary models.
- Estimated costs and exact token counts might be unavailable depending on the provider payload structure.
`;

  const reportPath = path.join(process.cwd(), 'docs', 'MASTRA_MODEL_COMPARISON.md');
  // Ensure docs dir exists
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`Model Comparison Report written to docs/MASTRA_MODEL_COMPARISON.md`);
}

async function main() {
  console.log('Starting GetWink Mastra AI POC Runner...');

  // 1. Verify environment values are loaded
  if (!process.env.LANGDOCK_ENDPOINT_URL || !process.env.LANGDOCK_API_CODE) {
    console.error('Error: LANGDOCK_ENDPOINT_URL or LANGDOCK_API_CODE is not configured in .env.local');
    process.exit(1);
  }

  // 2. Perform Privacy and Redaction tests
  await testPrivacyBoundaryAndTraceRedaction();

  // 3. Test existing AI Service compatibility
  await testExistingAiService();

  // 4. Run workflows with configured models
  const primaryModel = process.env.GETWINK_MASTRA_MODEL_PROFILE || process.env.MODEL || 'gpt-5.1';
  const secondaryModel = process.env.GETWINK_MASTRA_MODEL_DISCOVERY || 'gpt-5.2';

  await runProfileAssistantPOC(primaryModel);
  await runDiscoveryRankingPOC(primaryModel);

  // Attempt running with the secondary model to compare outputs
  if (secondaryModel !== primaryModel) {
    try {
      await runProfileAssistantPOC(secondaryModel);
      await runDiscoveryRankingPOC(secondaryModel);
    } catch (err) {
      console.log(`Secondary model ${secondaryModel} was not fully tested or failed to initialize.`);
    }
  }

  // 5. Generate and write the comparison report
  await writeModelComparisonReport();

  console.log('\nPOC Execution Complete!');
}

main().catch((err) => {
  console.error('Fatal Error during POC execution:', err);
  process.exit(1);
});
