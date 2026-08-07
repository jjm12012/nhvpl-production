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
    INTERMEDIATE_A: 'Intermediate A',
    INTERMEDIATE_B: 'Intermediate B',
    ADVANCED_A: 'Advanced A',
    ADVANCED_B: 'Advanced B',
  };

  return labels[level];
}

export function divisionDescription(level: SkillLevel): string {
  const descriptions: Record<SkillLevel, string> = {
    BEGINNER: 'Under 2.0: Little or no pickleball experience; looking to learn the rules and how to play',
    INTERMEDIATE_B: '2.0-3.0: Understand the rules and looking to improve with consistency and basic strategy',
    INTERMEDIATE_A: '3.0-3.5: Grasped basic strategies and incorporating spin and power into your game',
    ADVANCED_B: '3.5-3.75: Competitive games; among the top players in rec play, mastering the third shot drop and shot selection',
    ADVANCED_A: '3.75+: Top-level competitive play; many of these players also compete in tournaments',
  };

  return descriptions[level];
}

// Capacity key used to look up the cap on Event for a given division.
export type DivisionCapacityKey =
  | 'maxBeginner'
  | 'maxIntermediateA'
  | 'maxIntermediateB'
  | 'maxAdvancedA'
  | 'maxAdvancedB';

export function divisionCapacityKey(level: SkillLevel): DivisionCapacityKey {
  const map: Record<SkillLevel, DivisionCapacityKey> = {
    BEGINNER: 'maxBeginner',
    INTERMEDIATE_A: 'maxIntermediateA',
    INTERMEDIATE_B: 'maxIntermediateB',
    ADVANCED_A: 'maxAdvancedA',
    ADVANCED_B: 'maxAdvancedB',
  };
  return map[level];
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

// Total max capacity summed across all divisions (null if no division has a cap).
export function totalMaxCapacity(event: Event): number | null {
  const caps = [
    event.maxBeginner,
    event.maxIntermediateA,
    event.maxIntermediateB,
    event.maxAdvancedA,
    event.maxAdvancedB,
  ].filter((c): c is number => typeof c === 'number');

  if (caps.length === 0) return null;
  return caps.reduce((sum, c) => sum + c, 0);
}

export function spotsRemaining(event: Event, paidCount: number): number | null {
  const total = totalMaxCapacity(event);
  if (total === null) return null;

  return Math.max(0, total - paidCount);
}

export function spotsRemainingForDivision(
  event: Event,
  level: SkillLevel,
  paidCountForDivision: number
): number | null {
  const key = divisionCapacityKey(level);
  const cap = event[key];
  if (cap === null || cap === undefined) return null;
  return Math.max(0, cap - paidCountForDivision);
}
