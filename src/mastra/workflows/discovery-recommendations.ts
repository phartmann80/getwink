import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { z } from 'zod';
import { discoveryInterestAgent } from '../agents/discovery-interest-agent';
import { DiscoveryRankingOutputSchema } from '../schemas/discovery-ranking';
import {
  getControlledCandidatePool,
  ToolOutputCandidateSchema,
} from '../tools/get-controlled-candidate-pool';

type CleanCandidate = z.infer<typeof ToolOutputCandidateSchema>;

export const recommendCandidatesStep = createStep({
  id: 'recommend-candidates-step',
  inputSchema: z.object({
    interestHistory: z.any(),
    rawCandidates: z.array(z.any()),
  }),
  outputSchema: DiscoveryRankingOutputSchema,
  execute: async ({ inputData }) => {
    const { interestHistory, rawCandidates } = inputData;

    // 1. Process candidate pool through the controlled tool (allowlist projection & deduplication)
    let cleanCandidates: CleanCandidate[] = [];
    try {
      const toolResult = await getControlledCandidatePool.execute({
        context: { rawCandidates },
        runtimeContext: new RuntimeContext(),
      });
      cleanCandidates = toolResult.candidates;
    } catch (err) {
      console.warn(`Controlled candidate pool tool failed: ${err instanceof Error ? err.message : String(err)}. Safely falling back.`);
      // Manual fallback projection
      cleanCandidates = rawCandidates
        .filter((c) => c.isBlocked !== true && c.isReported !== true)
        .map((c) => ({
          candidateId: c.candidateId,
          displayName: c.displayName,
          bio: c.bio || '',
          visibleInterests: c.visibleInterests || [],
          city: c.city,
        }));
    }

    if (cleanCandidates.length === 0) {
      return { rankedCandidates: [] };
    }

    try {
      const prompt = `
You are given a list of candidate profiles and a historical interest profile of the active user.
Interest History:
${JSON.stringify(interestHistory, null, 2)}

Candidates:
${JSON.stringify(cleanCandidates, null, 2)}

Rank the candidates according to their interestScore matching the user's history.
      `;

      // 2. Generate structured ranking output
      const response = await discoveryInterestAgent.generate(prompt, {
        structuredOutput: {
          schema: DiscoveryRankingOutputSchema,
        },
      });

      const result = response.object;
      if (!result || !result.rankedCandidates) {
        throw new Error('Discovery Agent did not return a valid structured output object');
      }

      // 3. Strict Verification & Validation on output
      const candidateIds = new Set(cleanCandidates.map((c) => c.candidateId));
      const verifiedRankings: typeof result.rankedCandidates = [];
      const seenIds = new Set<string>();

      for (const rank of result.rankedCandidates) {
        const score = typeof rank.interestScore === 'number' ? rank.interestScore : 0.0;
        const conf = typeof rank.confidence === 'number' ? rank.confidence : 0.0;

        // a. Score and confidence bounds [0, 1]
        if (score < 0 || score > 1 || conf < 0 || conf > 1) {
          throw new Error(`Invalid score or confidence out of bounds [0, 1]: score=${score}, confidence=${conf}`);
        }

        // b. Candidate ID existence in supplied list (no invented IDs)
        if (!candidateIds.has(rank.candidateId)) {
          throw new Error(`AI returned an unknown candidate ID: ${rank.candidateId}`);
        }

        // c. No duplicate IDs in ranking
        if (seenIds.has(rank.candidateId)) {
          throw new Error(`AI returned duplicate candidate ID in ranking: ${rank.candidateId}`);
        }
        seenIds.add(rank.candidateId);

        verifiedRankings.push({
          candidateId: rank.candidateId,
          interestScore: score,
          confidence: conf,
          explanation: rank.explanation,
        });
      }

      // Sort ranked candidates by score descending
      verifiedRankings.sort((a, b) => b.interestScore - a.interestScore);

      return { rankedCandidates: verifiedRankings };
    } catch (err) {
      // SAFE FALLBACK: If AI fails, return the original candidate list in its deterministic order
      console.warn(`[SAFE FALLBACK] Discovery Interest Agent failed: ${err instanceof Error ? err.message : String(err)}. Returning deterministic order.`);
      
      const fallbackRankings = cleanCandidates.map((c) => ({
        candidateId: c.candidateId,
        interestScore: 0.5, // neutral fallback score
        confidence: 0.0,
        explanation: 'Safely fell back to original deterministic order due to processing error.',
      }));

      return { rankedCandidates: fallbackRankings };
    }
  },
});

export const discoveryRecommendationsWorkflow = createWorkflow({
  id: 'discovery-recommendations-workflow',
  inputSchema: z.object({
    interestHistory: z.any(),
    rawCandidates: z.array(z.any()),
  }),
  outputSchema: DiscoveryRankingOutputSchema,
})
  .then(recommendCandidatesStep)
  .commit();
