import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Event, SkillLevel, PaymentMethod } from '@prisma/client';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numAmount);
}

export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPhone(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // If we don't have 10 digits, return as is
  if (digits.length !== 10) {
    return value;
  }

  // Format as (XXX) XXX-XXXX
  const areaCode = digits.substring(0, 3);
  const exchange = digits.substring(3, 6);
  const subscriber = digits.substring(6, 10);

  return `(${areaCode}) ${exchange}-${subscriber}`;
}

export function divisionLabel(level: SkillLevel): string {
  const labels: Record<SkillLevel, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };

  return labels[level];
}

export function divisionDescription(level: SkillLevel): string {
  const descriptions: Record<SkillLevel, string> = {
    BEGINNER: 'New to pickleball or playing for less than 1 year',
    INTERMEDIATE: 'Playing for 1-3 years with some tournament experience',
    ADVANCED: 'Playing for 3+ years with consistent tournament play',
  };

  return descriptions[level];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    STRIPE_CARD: 'Credit/Debit Card',
    STRIPE_APPLE_PAY: 'Apple Pay',
    STRIPE_GOOGLE_PAY: 'Google Pay',
    PAYPAL: 'PayPal',
  };

  return labels[method];
}

export function isRegistrationOpen(event: Event): boolean {
  const now = new Date();
  return now >= event.registrationOpen && now <= event.registrationClose && event.isActive;
}

export function spotsRemaining(event: Event, paidCount: number): number | null {
  if (!event.maxCapacity) {
    return null;
  }

  return Math.max(0, event.maxCapacity - paidCount);
}
