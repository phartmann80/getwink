import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { profileAssistantAgent } from '../agents/profile-assistant';
import { ProfileAssistantOutputSchema } from '../schemas/profile-assistant';

export const analyzeProfileStep = createStep({
  id: 'analyze-profile-step',
  inputSchema: z.object({
    profile: z.any(),
    requestBioDraft: z.boolean().default(false),
  }),
  outputSchema: ProfileAssistantOutputSchema,
  execute: async ({ inputData }) => {
    const { profile, requestBioDraft } = inputData;
    try {
      const prompt = `
Please analyze the following profile data.
Profile: ${JSON.stringify(profile, null, 2)}

User explicitly requested a bio draft: ${requestBioDraft ? 'YES' : 'NO'}.
      `;
      const response = await profileAssistantAgent.generate(prompt, {
        structuredOutput: {
          schema: ProfileAssistantOutputSchema,
        },
      });

      if (!response.object) {
        throw new Error('Profile Assistant did not return a valid structured output object');
      }

      return response.object;
    } catch (err) {
      console.warn(`[SAFE FALLBACK] Profile Assistant failed: ${err instanceof Error ? err.message : String(err)}. Returning default feedback.`);
      return {
        profileComplete: false,
        missingFields: [],
        suggestions: ['Could not complete profile analysis at this time. Please try again later.'],
        bioDraft: null,
        explanation: `Safe fallback activated. Internal service error.`,
      };
    }
  },
});

export const profileAssistanceWorkflow = createWorkflow({
  id: 'profile-assistance-workflow',
  inputSchema: z.object({
    profile: z.any(),
    requestBioDraft: z.boolean().default(false),
  }),
  outputSchema: ProfileAssistantOutputSchema,
})
  .then(analyzeProfileStep)
  .commit();
