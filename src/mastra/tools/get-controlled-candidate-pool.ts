import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const ToolInputCandidateSchema = z.object({
  candidateId: z.string(),
  displayName: z.string(),
  bio: z.string(),
  visibleInterests: z.array(z.string()),
  city: z.string().optional(),
  // Unexpected private fields for safety verification
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  authId: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  isBlocked: z.boolean().optional(),
  isReported: z.boolean().optional(),
  moderationNotes: z.string().optional(),
});

export const ToolOutputCandidateSchema = z.object({
  candidateId: z.string(),
  displayName: z.string(),
  bio: z.string(),
  visibleInterests: z.array(z.string()),
  city: z.string().optional(),
});

export const getControlledCandidatePool = createTool({
  id: 'get-controlled-candidate-pool',
  description: 'Retrieves a projection of the eligible candidate pool containing only public profile details.',
  inputSchema: z.object({
    rawCandidates: z.array(ToolInputCandidateSchema).describe('The unfiltered list of candidate profiles provided by the server.'),
  }),
  outputSchema: z.object({
    candidates: z.array(ToolOutputCandidateSchema),
  }),
  execute: async ({ context }) => {
    const { rawCandidates } = context;
    if (!rawCandidates || rawCandidates.length === 0) {
      return { candidates: [] };
    }

    const seenIds = new Set<string>();
    const cleanedCandidates: z.infer<typeof ToolOutputCandidateSchema>[] = [];

    for (const cand of rawCandidates) {
      // 1. Remove duplicate candidate IDs
      if (seenIds.has(cand.candidateId)) {
        continue;
      }
      seenIds.add(cand.candidateId);

      // 2. Secondary safety check: exclude blocked or reported candidates
      if (cand.isBlocked === true || cand.isReported === true) {
        continue;
      }

      // 3. Allowlist projection (explicitly copy only allowlisted fields)
      cleanedCandidates.push({
        candidateId: cand.candidateId,
        displayName: cand.displayName,
        bio: cand.bio,
        visibleInterests: cand.visibleInterests,
        city: cand.city,
      });
    }

    return { candidates: cleanedCandidates };
  },
});
