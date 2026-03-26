import type { Event, Registration, AdminUser, SkillLevel, PaymentStatus, PaymentMethod } from '@prisma/client';

// Re-export Prisma types for convenience
export type { SkillLevel, PaymentStatus, PaymentMethod };

export type EventWithRegistrations = Event & {
  registrations: Registration[];
};

export type RegistrationWithEvent = Registration & {
  event: Event;
};

export interface EventListItem {
  id: string;
  name: string;
  season: string;
  year: number;
  startDate: Date;
  endDate: Date;
  registrationOpen: Date;
  registrationClose: Date;
  price: number;
  currency: string;
  maxCapacity: number | null;
  location: string | null;
  isActive: boolean;
  registrationCount?: number;
  paidCount?: number;
}

export interface RegistrationListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  division: SkillLevel;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  amountPaid: number | null;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  totalRevenue: number;
}

export interface EventStats {
  eventId: string;
  eventName: string;
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  failedRegistrations: number;
  spotsRemaining: number | null;
  revenue: number;
}
