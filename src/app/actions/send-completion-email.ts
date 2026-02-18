
'use server';

import { Resend } from 'resend';
import { CompletionEmail } from '@/emails/completion-email';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCompletionEmail(
  volunteerEmail: string,
  taskTitle: string,
  coordinatorName: string // Changed from email for better personalization
): Promise<{ success: boolean; message: string }> {
  
  if (!volunteerEmail || !taskTitle || !coordinatorName) {
    throw new Error('Missing required parameters for sending email.');
  }

  if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key is not configured. Email will be logged to console instead.");
      console.log('--- Simulating Task Completion Email ---');
      console.log(`To: ${volunteerEmail}`);
      console.log(`From: verification@cosmicconnect.app`);
      console.log(`Subject: Your contribution for "${taskTitle}" has been verified!`);
      console.log('------------------------------------');
      return { success: true, message: 'Email simulated and logged to console.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'CosmicConnect <onboarding@resend.dev>', // You will need to verify a domain with Resend to use a custom 'from' address
      to: [volunteerEmail],
      subject: `Your contribution for "${taskTitle}" has been verified!`,
      react: CompletionEmail({ volunteerEmail, taskTitle, coordinatorName }) as React.ReactElement,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(error.message);
    }

    return { success: true, message: 'Confirmation email sent successfully.' };

  } catch (error: any) {
    console.error('Failed to send email:', error);
    // In case of failure, re-throw the error so the client can handle it
    throw new Error('An unknown error occurred while sending the email.');
  }
}
