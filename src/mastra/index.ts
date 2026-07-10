import { Mastra } from '@mastra/core';
import { profileAssistantAgent } from './agents/profile-assistant';
import { discoveryInterestAgent } from './agents/discovery-interest-agent';
import { profileAssistanceWorkflow } from './workflows/profile-assistance';
import { discoveryRecommendationsWorkflow } from './workflows/discovery-recommendations';

export const mastra = new Mastra({
  agents: {
    profileAssistant: profileAssistantAgent,
    discoveryInterest: discoveryInterestAgent,
  },
  workflows: {
    profileAssistance: profileAssistanceWorkflow,
    discoveryRecommendations: discoveryRecommendationsWorkflow,
  },
});
