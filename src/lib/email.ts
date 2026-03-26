import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY is not set in environment variables');
}

export const resend = new Resend(resendApiKey);

export interface ConfirmationEmailData {
  to: string;
  firstName: string;
  eventName: string;
  eventDate: string;
  division: string;
  paymentStatus: string;
  amountPaid?: number;
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  // Stub implementation - to be filled in with actual email template
  console.log('Sending confirmation email to:', data.to, data);

  // TODO: Implement actual email sending with Resend
  // await resend.emails.send({
  //   from: 'noreply@nhvpl.com',
  //   to: data.to,
  //   subject: `Registration Confirmation - ${data.eventName}`,
  //   html: renderEmailTemplate(data),
  // });
}
