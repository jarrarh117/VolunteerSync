'use server';
/**
 * @fileOverview An AI flow to generate task details for a volunteer event.
 *
 * - generateTask - Generates a task title, description, and location.
 * - GenerateTaskInput - The input type for the generateTask function.
 * - GenerateTaskOutput - The return type for the generateTask function.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
          },
          required: ['title', 'description', 'location'],
        },
      },
    });

    const prompt = `You are an expert at creating engaging volunteer opportunities. Based on the user's prompt, generate a creative task title, a detailed description, and a suitable location.

Prompt: ${input.prompt}

Generate a response with:
- title: A creative and engaging title for the volunteer task
- description: A detailed, one-paragraph description of the task, explaining what volunteers will do
- location: A plausible, fictional or real-world location for the event

The tone should be inspiring and community-focused. The location should make sense for the task described.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const parsed = JSON.parse(response);
    
    return GenerateTaskOutputSchema.parse(parsed);
  } catch (error: any) {
    console.error('Error generating task:', error);
    throw new Error(`Failed to generate task: ${error.message}`);
  }
}
