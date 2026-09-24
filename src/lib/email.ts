import { Resend } from 'resend';
import type { Registration, Event } from '@prisma/client';
import { divisionLabel, formatDate, formatCurrency, paymentMethodLabel } from './utils';

const resendApiKey = process.env.RESEND_API_KEY;

// Lazily construct the Resend client so a missing key doesn't crash the
// whole app at import time (e.g. in dev without Resend configured).
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || 'NHVPL <noreply@nhvpickleball.com>';
const LEAGUE_CONTACT = 'nhvpickleball@gmail.com';

export interface ConfirmationEmailData {
  to: string;
  firstName: string;
  lastName: string;
  event: Pick<Event, 'name' | 'startDate' | 'endDate' | 'location' | 'dayOfWeek' | 'currency'>;
  division: Registration['division'];
  teamPreference?: string | null;
  paymentStatus: Registration['paymentStatus'];
  paymentMethod?: Registration['paymentMethod'] | null;
  amountPaid?: number | null;
  registrationId: string;
}

function renderEmailHtml(data: ConfirmationEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://register.nhvpickleball.com';
  const currency = data.event.currency || 'USD';
  const amount =
    data.amountPaid !== undefined && data.amountPaid !== null
      ? formatCurrency(Number(data.amountPaid), currency)
      : '—';
  const paymentMethod = data.paymentMethod ? paymentMethodLabel(data.paymentMethod) : '—';
  const teamPref = data.teamPreference?.trim() || 'No preference listed';

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:24px 24px 0 24px;">
        <h1 style="margin:0 0 8px 0;font-size:22px;color:#111827;">You're registered, ${escapeHtml(data.firstName)}!</h1>
        <p style="margin:0 0 16px 0;color:#4b5563;font-size:14px;">
          Welcome to the New Haven Pickleball League. Here's a copy of your registration for your records.
        </p>
      </div>

      <div style="padding:0 24px;">
        <h2 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Event Details</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 0;width:140px;color:#6b7280;">Event</td><td style="padding:4px 0;">${escapeHtml(data.event.name)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Dates</td><td style="padding:4px 0;">${formatDate(data.event.startDate)} — ${formatDate(data.event.endDate)}</td></tr>
          ${data.event.dayOfWeek ? `<tr><td style="padding:4px 0;color:#6b7280;">When</td><td style="padding:4px 0;">${escapeHtml(data.event.dayOfWeek)}</td></tr>` : ''}
          ${data.event.location ? `<tr><td style="padding:4px 0;color:#6b7280;">Location</td><td style="padding:4px 0;">${escapeHtml(data.event.location)}</td></tr>` : ''}
        </table>

        <h2 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Your Registration</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 0;width:140px;color:#6b7280;">Name</td><td style="padding:4px 0;">${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Division</td><td style="padding:4px 0;">${escapeHtml(divisionLabel(data.division))}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;vertical-align:top;">Team preference</td><td style="padding:4px 0;">${escapeHtml(teamPref)}</td></tr>
        </table>

        <h2 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Payment</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 0;width:140px;color:#6b7280;">Status</td><td style="padding:4px 0;">${escapeHtml(data.paymentStatus)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Method</td><td style="padding:4px 0;">${escapeHtml(paymentMethod)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Amount</td><td style="padding:4px 0;"><strong>${escapeHtml(amount)}</strong></td></tr>
        </table>

        <h2 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">What's next</h2>
        <ol style="margin:0 0 16px 20px;padding:0;color:#374151;font-size:14px;line-height:1.5;">
          <li>Watch for league updates by email over the coming weeks.</li>
          <li>Arrive about 30 minutes before your first match to check in.</li>
          <li>Bring your own paddle. Balls and nets are provided.</li>
          <li>Have fun and meet some new folks!</li>
        </ol>

        <p style="margin:16px 0 0 0;font-size:14px;color:#374151;">
          Questions? Email us at
          <a href="mailto:${LEAGUE_CONTACT}" style="color:#2563eb;text-decoration:none;">${LEAGUE_CONTACT}</a>
          or view your confirmation anytime:
          <a href="${appUrl}/confirmation/${data.registrationId}" style="color:#2563eb;text-decoration:none;">View confirmation</a>.
        </p>
      </div>

      <div style="padding:20px 24px;margin-top:24px;background:#f3f4f6;color:#6b7280;font-size:12px;text-align:center;">
        © ${new Date().getFullYear()} New Haven Pickleball League
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convenience: send a confirmation email for a given registrationId by looking up
// the row + event. Safe to call from webhook/callback paths.
export async function sendConfirmationEmailForRegistration(
  registrationId: string
): Promise<void> {
  // Lazy import to avoid pulling prisma into modules that only need the template.
  const { prisma } = await import('./prisma');
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });
  if (!registration) {
    console.warn(`[email] registration ${registrationId} not found, skipping email`);
    return;
  }

  await sendConfirmationEmail({
    to: registration.email,
    firstName: registration.firstName,
    lastName: registration.lastName,
    event: registration.event,
    division: registration.division,
    teamPreference: registration.teamPreference,
    paymentStatus: registration.paymentStatus,
    paymentMethod: registration.paymentMethod,
    amountPaid: registration.amountPaid ? Number(registration.amountPaid) : null,
    registrationId: registration.id,
  });
}

// ---------------------------------------------------------------------------
// Merchandise order emails
// ---------------------------------------------------------------------------

interface MerchOrderEmailData {
  eventName: string;
  productName: string;
  name: string;
  email: string;
  fit: string | null;
  size: string;
  color: string;
  quantity: number;
  totalAmount: number;
  createdAt: Date;
}

function renderMerchOrderHtml(data: MerchOrderEmailData, heading: string, intro: string): string {
  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:24px 24px 0 24px;">
        <h1 style="margin:0 0 8px 0;font-size:22px;color:#111827;">${heading}</h1>
        <p style="margin:0 0 16px 0;color:#4b5563;font-size:14px;">${intro}</p>
      </div>

      <div style="padding:0 24px;">
        <h2 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Order Details</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 0;width:140px;color:#6b7280;">Name</td><td style="padding:4px 0;">${escapeHtml(data.name)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Event</td><td style="padding:4px 0;">${escapeHtml(data.eventName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Item</td><td style="padding:4px 0;">${escapeHtml(data.productName)}</td></tr>
          ${data.fit ? `<tr><td style="padding:4px 0;color:#6b7280;">Fit</td><td style="padding:4px 0;">${escapeHtml(data.fit)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#6b7280;">Size</td><td style="padding:4px 0;">${escapeHtml(data.size)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Color</td><td style="padding:4px 0;">${escapeHtml(data.color)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Quantity</td><td style="padding:4px 0;">${data.quantity}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Total paid</td><td style="padding:4px 0;"><strong>${escapeHtml(formatCurrency(data.totalAmount))}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Order date</td><td style="padding:4px 0;">${formatDate(data.createdAt)}</td></tr>
        </table>

        <p style="margin:24px 0 0 0;font-size:14px;color:#374151;">
          Questions? Email us at
          <a href="mailto:${LEAGUE_CONTACT}" style="color:#2563eb;text-decoration:none;">${LEAGUE_CONTACT}</a>.
        </p>
      </div>

      <div style="padding:20px 24px;margin-top:24px;background:#f3f4f6;color:#6b7280;font-size:12px;text-align:center;">
        © ${new Date().getFullYear()} New Haven Pickleball League
      </div>
    </div>
  </body>
</html>`;
}

// Send buyer confirmation + admin notification for a paid merchandise order.
// Called exactly once per order by whichever writer created the row
// (webhook or success-page confirm). Email failures are logged, not thrown.
export async function sendMerchOrderEmails(orderId: string): Promise<void> {
  const { prisma } = await import('./prisma');
  const order = await prisma.merchandiseOrder.findUnique({
    where: { id: orderId },
    include: { event: { select: { name: true } } },
  });
  if (!order) {
    console.warn(`[email] merch order ${orderId} not found, skipping emails`);
    return;
  }

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set; skipping merch order emails for ${orderId}`);
    return;
  }

  const data: MerchOrderEmailData = {
    eventName: order.event.name,
    productName: order.productName,
    name: order.name,
    email: order.email,
    fit: order.fit,
    size: order.size,
    color: order.color,
    quantity: order.quantity,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
  };

  // Buyer confirmation
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: order.email,
      subject: 'Your NHVPL merch order is confirmed! 🎽',
      html: renderMerchOrderHtml(
        data,
        `Order confirmed, ${escapeHtml(order.name.split(' ')[0])}!`,
        "Thanks for your order. Here's a copy of the details for your records."
      ),
    });
    console.log(`[email] merch confirmation sent to ${order.email} for order ${orderId}`);
  } catch (error) {
    console.error('[email] failed to send merch buyer confirmation:', error);
  }

  // Admin notification
  const adminEmail = process.env.ADMIN_EMAIL || LEAGUE_CONTACT;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `New merch order — ${order.name} (${order.productName})`,
      html: renderMerchOrderHtml(
        data,
        'New merch order received',
        `${escapeHtml(order.name)} (${escapeHtml(order.email)}) just placed an order.`
      ),
    });
    console.log(`[email] merch admin notification sent to ${adminEmail} for order ${orderId}`);
  } catch (error) {
    console.error('[email] failed to send merch admin notification:', error);
  }
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set; skipping confirmation email to ${data.to}`
    );
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.to,
      subject: `You're registered — ${data.event.name}`,
      html: renderEmailHtml(data),
    });
    console.log(`[email] confirmation sent to ${data.to} for registration ${data.registrationId}`);
  } catch (error) {
    // Don't fail the registration flow if the email provider has a hiccup —
    // log it and move on. The user still sees the on-page confirmation.
    console.error('[email] failed to send confirmation:', error);
  }
}
