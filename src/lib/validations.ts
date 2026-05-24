import { z } from 'zod';

export const registrationSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  confirmEmail: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  phone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be in format (XXX) XXX-XXXX'),
  division: z.enum(['BEGINNER', 'INTERMEDIATE_A', 'INTERMEDIATE_B', 'ADVANCED']),
  canCommit: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you can commit to the season' }),
  }),
  interestedInCaptain: z.enum(['yes', 'no']),
  willingToMonitor: z.enum(['yes', 'no']),
  teamPreference: z
    .string()
    .max(200, 'Team preference must be at most 200 characters')
    .optional(),
  liabilityAck: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the liability waiver' }),
  }),
  funAck: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the fun waiver' }),
  }),
  conductAck: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the code of conduct' }),
  }),
}).refine((data) => data.email === data.confirmEmail, {
  message: 'Email addresses do not match',
  path: ['confirmEmail'],
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const eventSchema = z.object({
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(255, 'Event name must be at most 255 characters'),
  description: z.string().optional(),
  season: z.string().min(1, 'Season is required'),
  year: z.number().int().min(2000).max(2100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationOpen: z.coerce.date(),
  registrationClose: z.coerce.date(),
  price: z.coerce.number().positive('Price must be positive'),
  currency: z.string().default('USD'),
  maxBeginner: z.coerce.number().int().nonnegative().optional(),
  maxIntermediateA: z.coerce.number().int().nonnegative().optional(),
  maxIntermediateB: z.coerce.number().int().nonnegative().optional(),
  maxAdvanced: z.coerce.number().int().nonnegative().optional(),
  location: z.string().optional(),
  dayOfWeek: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => data.startDate < data.endDate, {
  message: 'Start date must be before end date',
  path: ['endDate'],
}).refine((data) => data.registrationOpen < data.registrationClose, {
  message: 'Registration opening must be before closing',
  path: ['registrationClose'],
}).refine((data) => data.registrationClose <= data.startDate, {
  message: 'Registration must close before event starts',
  path: ['registrationClose'],
});

export type EventInput = z.infer<typeof eventSchema>;
