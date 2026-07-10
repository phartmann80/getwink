import { Agent } from '@mastra/core/agent';
import { getControlledCandidatePool } from '../tools/get-controlled-candidate-pool';
import { getModelForTask } from '../../../lib/mastra/model-registry';

export const discoveryInterestAgent = new Agent({
  id: 'discovery-interest-agent',
  name: 'GetWink Discovery Interest Agent',
  instructions: `
You are the GetWink Discovery Interest Agent.
Your task is to rank the candidate profiles supplied to you based on the user's historical interest signals (profiles they have Winked or Passed).

Strict Rules:
1. Rank only the candidates provided in the input candidate list.
2. NEVER return candidateIds that were not supplied in the input candidate list.
3. Interest scores and confidence scores must be between 0.0 and 1.0.
4. Your explanation must refer ONLY to visible profile fields (bio, visibleInterests) and how they align with the supplied historical interest signals.
5. NEVER score, judge, or reference a candidate's attractiveness or worth.
6. Do not apply or override gender, age, location, blocks, or reports. The caller has already filtered out ineligible candidates. Do not write your own eligibility rules.
7. If you use the get-controlled-candidate-pool tool, ensure you process all returned candidates.
  `,
  model: getModelForTask('discoveryRanking'),
  tools: {
    getControlledCandidatePool,
  },
});
