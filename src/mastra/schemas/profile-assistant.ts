import { z } from 'zod';

export const ProfileAssistantOutputSchema = z.object({
  profileComplete: z.boolean().describe('Whether the profile is complete'),
  missingFields: z.array(z.string()).describe('List of missing required fields'),
  suggestions: z.array(z.string()).describe('Constructive, respectful suggestions to improve the profile'),
  bioDraft: z.string().nullable().describe('Constructive draft bio (must be null unless explicitly requested)'),
  explanation: z.string().describe('Explanation of the analysis')
});

export type ProfileAssistantOutput = z.infer<typeof ProfileAssistantOutputSchema>;
