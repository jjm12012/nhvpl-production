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
  division: z.enum(['BEGINNER', 'INTERMEDIATE_A', 'INTERMEDIATE_B', 'ADVANCED_A', 'ADVANCED_B']),
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
  maxAdvancedA: z.coerce.number().int().nonnegative().optional(),
  maxAdvancedB: z.coerce.number().int().nonnegative().optional(),
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

// ---------------------------------------------------------------------------
// Merchandise feature (events sell one or more products)
// ---------------------------------------------------------------------------

// Default option lists prefilled into a NEW product row in admin. These are
// no longer validation enums: every product carries its own admin-editable
// sizes/fits/colors, and orders are validated against the product server-side.
export const DEFAULT_PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const;
export const DEFAULT_PRODUCT_FITS = ["Men's", "Women's"] as const;

// Comma-separated admin input -> trimmed, de-duplicated string[].
const csvList = z
  .string()
  .transform((value) =>
    Array.from(
      new Set(
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      )
    )
  );

// One product under a merchandise event. `id` is present when editing an
// existing product so the API can upsert by id. An empty `fits` list means
// the order form does not ask for a fit.
export const merchProductSchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be at most 100 characters')
    .trim(),
  description: z.string().max(500).optional(),
  unitPrice: z.coerce.number().positive('Price must be positive'),
  availableColors: csvList.refine((v) => v.length > 0, {
    message: 'At least one color is required',
  }),
  sizes: csvList.refine((v) => v.length > 0, {
    message: 'At least one size is required',
  }),
  fits: csvList,
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export type MerchProductInput = z.infer<typeof merchProductSchema>;

// Admin creates/edits a merchandise event: name, description, order window,
// and one or more products.
export const merchandiseEventSchema = z.object({
  formType: z.literal('MERCHANDISE'),
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(255, 'Event name must be at most 255 characters'),
  description: z.string().optional(),
  orderOpenDate: z.coerce.date(),
  orderCloseDate: z.coerce.date(),
  isActive: z.boolean().default(true),
  products: z.array(merchProductSchema).min(1, 'Add at least one product'),
}).refine((data) => data.orderOpenDate < data.orderCloseDate, {
  message: 'Order open date must be before close date',
  path: ['orderCloseDate'],
});

export type MerchandiseEventInput = z.infer<typeof merchandiseEventSchema>;

// Public order form submission (pre-Stripe checkout). Size/color/fit are
// plain strings here; the checkout route checks them against the chosen
// product's option lists.
export const merchandiseOrderSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  productId: z.string().min(1, 'Please select an item'),
  name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  fit: z.string().optional(),
  size: z.string().min(1, 'Please select a size'),
  color: z.string().min(1, 'Please select a color'),
  quantity: z.coerce
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
});

export type MerchandiseOrderInput = z.infer<typeof merchandiseOrderSchema>;

// Admin edit of a single editable content block. Keys/pages/labels are
// seed-defined and never created or changed via the API — only the value and
// its render format are editable.
export const contentBlockUpdateSchema = z.object({
  value: z
    .string()
    .max(10000, 'Content must be at most 10,000 characters'),
  format: z.enum(['TEXT', 'MARKDOWN']),
});

export type ContentBlockUpdateInput = z.infer<typeof contentBlockUpdateSchema>;
