'use server';
/**
 * @fileOverview An AI flow to generate task details for a volunteer event.
 *
 * - generateTask - Generates a task title, description, and location.
 * - GenerateTaskInput - The input type for the generateTask function.
 * - GenerateTaskOutput - The return type for the generateTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateTaskInputSchema = z.object({
  prompt: z.string().describe('A short description or idea for a volunteer task.'),
});
export type GenerateTaskInput = z.infer<typeof GenerateTaskInputSchema>;

const GenerateTaskOutputSchema = z.object({
  title: z.string().describe('A creative and engaging title for the volunteer task.'),
  description: z.string().describe('A detailed, one-paragraph description of the task, explaining what volunteers will do.'),
  location: z.string().describe('A plausible, fictional or real-world location for the event.'),
});
export type GenerateTaskOutput = z.infer<typeof GenerateTaskOutputSchema>;

export async function generateTask(input: GenerateTaskInput): Promise<GenerateTaskOutput> {
  return generateTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTaskPrompt',
  input: { schema: GenerateTaskInputSchema },
  output: { schema: GenerateTaskOutputSchema },
  prompt: `You are an expert at creating engaging volunteer opportunities. Based on the user's prompt, generate a creative task title, a detailed description, and a suitable location.

  Prompt: {{{prompt}}}
  
  Generate a response in the specified format. The tone should be inspiring and community-focused. The location should make sense for the task described.`,
});

const generateTaskFlow = ai.defineFlow(
  {
    name: 'generateTaskFlow',
    inputSchema: GenerateTaskInputSchema,
    outputSchema: GenerateTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
