import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const TaskDetailSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  date: z.string(),
});

const GenerateDataReportInputSchema = z.object({
  volunteerEmail: z.string(),
  task: TaskDetailSchema,
});

const GenerateDataReportOutputSchema = z.object({
  taskRecap: z.object({
    title: z.string(),
    date: z.string(),
    status: z.string(),
  }),
  volunteerPerformance: z.object({
    summary: z.string(),
    strengths: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = GenerateDataReportInputSchema.parse(body);

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
            taskRecap: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: { type: 'string' },
                status: { type: 'string' },
              },
              required: ['title', 'date', 'status'],
            },
            volunteerPerformance: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                suggestions: { type: 'array', items: { type: 'string' } },
              },
              required: ['summary', 'strengths', 'suggestions'],
            },
          },
          required: ['taskRecap', 'volunteerPerformance'],
        } as any,
      },
    });

    const prompt = `You are a Volunteer Coordinator writing a performance review for a volunteer based on their work on a single task.

Volunteer's Email: ${input.volunteerEmail}

Task Details:
- Title: ${input.task.title}
- Description: ${input.task.description}
- Duration: ${input.task.duration} hours
- Date: ${input.task.date}

Analyze the provided task information and generate a structured performance report focusing ONLY on this task.
1.  **Task Recap:**
    - Restate the task title.
    - Restate the completion date.
    - Set the status to 'Completed'.
2.  **Volunteer Performance Analysis:**
    - Write a brief, positive summary (2-3 sentences) of the volunteer's contribution to this specific mission.
    - Identify 2-3 key strength areas demonstrated during this task (e.g., 'Teamwork', 'Problem-Solving', 'Community Engagement').
    - Provide 1-2 constructive and encouraging suggestions for future roles based on their performance here.

Return the final analysis in the structured JSON format specified. The tone should be encouraging and appreciative.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const parsed = JSON.parse(response);
    
    const validated = GenerateDataReportOutputSchema.parse(parsed);
    
    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('Error generating report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
