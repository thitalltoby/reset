import { describe, it, expect } from 'vitest';
import { checkoutSchema, enquirySchema, phoneSchema, registerSchema, rxSchema, fieldErrors } from '@/lib/validation';

const base = { name: 'Ada Okafor', email: ' ADA@Example.test ', phone: '0800 000 0001', fulfilment: 'PICKUP', paymentMethod: 'ON_DELIVERY' };

describe('input validation', () => {
  it('tidies email and accepts normal Nigerian phone formats', () => {
    const r = checkoutSchema.parse(base);
    expect(r.email).toBe('ada@example.test');
    for (const ok of ['08012345678', '+234 801 234 5678']) expect(phoneSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ['abc', '123', '+234<script>', '0'.repeat(30)]) expect(phoneSchema.safeParse(bad).success, bad).toBe(false);
  });
  it('rejects unknown fulfilment or payment values', () => {
    expect(checkoutSchema.safeParse({ ...base, fulfilment: 'COURIER' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, paymentMethod: 'BITCOIN' }).success).toBe(false);
  });
  it('requires consent for prescriptions', () => {
    const r = rxSchema.safeParse({ ...base, consent: false });
    expect(r.success).toBe(false);
    expect(rxSchema.safeParse({ ...base, consent: true }).success).toBe(true);
  });
  it('reports one friendly message per field', () => {
    const r = enquirySchema.safeParse({ name: '', email: 'nope', message: 'short' });
    expect(r.success).toBe(false);
    const f = fieldErrors((r as unknown as { error: import('zod').ZodError }).error);
    expect(Object.keys(f).sort()).toEqual(['email', 'message', 'name']);
  });
  it('treats marketing and SMS as off unless ticked', () => {
    expect(registerSchema.parse({ name: 'Ada Okafor', email: 'a@b.co', password: 'x' }).marketing).toBe(false);
    expect(checkoutSchema.parse(base).sms).toBe(false);
  });
});
