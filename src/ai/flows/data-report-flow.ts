
'use server';
/**
 * @fileOverview An AI flow to generate a data-driven performance report for a volunteer's specific task.
 *
 * - generateDataReport - Generates a detailed performance report for a single task.
 * - GenerateDataReportInput - The input type for the generateDataReport function.
 * - GenerateDataReportOutput - The return type for the generateDataReport function.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const TaskDetailSchema = z.object({
  title: z.string().describe("The title of the completed task."),
  description: z.string().describe("The description of the task that was completed."),
  duration: z.number().describe("The duration of the task in hours."),
  date: z.string().describe("The date the task was completed in ISO format."),
});

const GenerateDataReportInputSchema = z.object({
  volunteerEmail: z.string().describe("The email address of the volunteer."),
  task: TaskDetailSchema,
});
export type GenerateDataReportInput = z.infer<typeof GenerateDataReportInputSchema>;

const GenerateDataReportOutputSchema = z.object({
  taskRecap: z.object({
    title: z.string().describe("The title of the task."),
    date: z.string().describe("The date the task was completed."),
    status: z.string().describe("The completion status of the task (e.g., 'Completed').")
  }),
  volunteerPerformance: z.object({
    summary: z.string().describe("A 2-3 sentence qualitative summary of the volunteer's contribution and performance on this specific task."),
    strengths: z.array(z.string()).describe("A list of 2-3 key strengths observed from this task, e.g., 'Leadership', 'Efficiency', 'Positive Attitude'."),
    suggestions: z.array(z.string()).describe("A list of 1-2 encouraging suggestions for future growth or involvement based on this task.")
  }),
});
export type GenerateDataReportOutput = z.infer<typeof GenerateDataReportOutputSchema>;

export async function generateDataReport(
  input: GenerateDataReportInput
): Promise<GenerateDataReportOutput> {
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
        },
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
    
    return GenerateDataReportOutputSchema.parse(parsed);
  } catch (error: any) {
    console.error('Error generating report:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}
