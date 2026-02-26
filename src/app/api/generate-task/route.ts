import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GenerateTaskInputSchema = z.object({
  prompt: z.string().min(10, 'Please describe the task in more detail.'),
});

const GenerateTaskOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = GenerateTaskInputSchema.parse(body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
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
        } as any,
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
    
    const validated = GenerateTaskOutputSchema.parse(parsed);
    
    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('Error generating task:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate task' },
      { status: 500 }
    );
  }
}
