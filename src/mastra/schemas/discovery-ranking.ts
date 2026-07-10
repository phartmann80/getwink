import { z } from 'zod';

export const DiscoveryRankingOutputSchema = z.object({
  rankedCandidates: z.array(
    z.object({
      candidateId: z.string().describe('The ID of the candidate'),
      interestScore: z.number().describe('Score between 0 and 1 indicating interest level'),
      confidence: z.number().describe('Confidence score between 0 and 1'),
      explanation: z.string().describe('Explanation based only on visible profile data and interest history')
    })
  ).describe('List of candidates ranked by interest score')
});

export type DiscoveryRankingOutput = z.infer<typeof DiscoveryRankingOutputSchema>;
