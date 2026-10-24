import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(200);

/** Phone numbers are free-form: digits with an optional leading + and common separators. At least 7 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .max(24, 'That phone number is too long.')
  .regex(/^\+?[0-9][0-9\s().-]*$/, 'Use digits, spaces and + ( ) - only.')
  .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a phone number we can reach you on.');

const text = (label: string, min = 1, max = 200) => z.string().trim().min(min, `Enter ${label}.`).max(max, `${label[0]!.toUpperCase()}${label.slice(1)} is too long.`);
const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || undefined);

export const addressSchema = z.object({
  line1: text('the street address', 3, 160),
  line2: optionalText(160),
  city: text('the town or city', 2, 80),
  state: text('the state', 2, 60),
  notes: optionalText(300),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  name: text('your full name', 2, 120),
  email: emailSchema,
  phone: phoneSchema,
  fulfilment: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['PAYSTACK', 'ON_DELIVERY']),
  zoneId: optionalText(60),
  note: optionalText(500),
  marketing: z.boolean().default(false),
  sms: z.boolean().default(false),
  saveAddress: z.boolean().default(false),
});

export const rxSchema = z.object({
  name: text('your full name', 2, 120),
  email: emailSchema,
  phone: phoneSchema,
  preference: z.enum(['PICKUP', 'DELIVERY', 'ASK']).default('PICKUP'),
  note: optionalText(1000),
  consent: z.literal(true, { error: 'Please tick the box to let us review your prescription.' }),
});

export const enquirySchema = z.object({
  type: z.enum(['GENERAL', 'PRODUCT', 'SERVICE', 'FEEDBACK', 'COMPLAINT']).default('GENERAL'),
  name: text('your name', 2, 120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')).transform((v) => v || undefined),
  message: text('your message', 10, 2000),
  productSlug: optionalText(120),
  serviceSlug: optionalText(120),
});

export const registerSchema = z.object({
  name: text('your full name', 2, 120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')).transform((v) => v || undefined),
  password: z.string().min(1, 'Choose a password.').max(200),
  marketing: z.boolean().default(false),
});

export type FieldErrors = Record<string, string>;

/** Turn a failed zod parse into { field: message }, first message per field. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const i of error.issues) {
    const k = i.path.join('.') || '_';
    if (!(k in out)) out[k] = i.message;
  }
  return out;
}
