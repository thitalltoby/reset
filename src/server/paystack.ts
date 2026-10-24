import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { env } from './env';
import { decryptJson } from './crypto';
import { httpCall, providerError } from './integrations/core';

export interface PaystackConfig { secret: string; base: string; source: 'console' | 'server' }

/** The key set in Integrations → Paystack wins; otherwise the PAYSTACK_SECRET_KEY environment variable. Null = card payments are not set up. */
export async function paystackConfig(): Promise<PaystackConfig | null> {
  try {
    const row = await db.integration.findUnique({ where: { key: 'paystack' } });
    if (row?.enabled) {
      const s = decryptJson(row.secretEnc) ?? {};
      if (s.secretKey) return { secret: s.secretKey, base: env.PAYSTACK_API_BASE, source: 'console' };
    }
  } catch { /* fall through to the environment */ }
  return env.PAYSTACK_SECRET_KEY ? { secret: env.PAYSTACK_SECRET_KEY, base: env.PAYSTACK_API_BASE, source: 'server' } : null;
}

export const keyMode = (secret: string) => (secret.startsWith('sk_live_') ? 'live' : secret.startsWith('sk_test_') ? 'test' : 'unknown');

export interface InitResult { authorizationUrl: string; accessCode: string; reference: string }

export async function initializeTransaction(cfg: PaystackConfig, p: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata: Record<string, unknown> }): Promise<InitResult> {
  const r = await httpCall(`${cfg.base}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, amount: p.amountKobo, currency: 'NGN', reference: p.reference, callback_url: p.callbackUrl, metadata: p.metadata }),
  });
  const j = r.json as { status?: boolean; data?: { authorization_url?: string; access_code?: string; reference?: string } } | null;
  if (!r.ok || !j?.status || !j.data?.authorization_url) throw new Error(`Paystack could not start the payment (${providerError(r)})`);
  return { authorizationUrl: j.data.authorization_url, accessCode: j.data.access_code ?? '', reference: j.data.reference ?? p.reference };
}

export interface Verification {
  reference: string;
  /** success | failed | abandoned | pending (anything else is treated as pending) */
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountKobo: number;
  currency: string;
  channel: string | null;
  gatewayResponse: string | null;
}

export async function verifyTransaction(cfg: PaystackConfig, reference: string): Promise<Verification> {
  const r = await httpCall(`${cfg.base}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${cfg.secret}` } });
  const j = r.json as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; channel?: string; gateway_response?: string; reference?: string } } | null;
  if (!r.ok || !j?.status || !j.data) throw new Error(`Paystack could not confirm the payment (${providerError(r)})`);
  const s = j.data.status;
  return {
    reference: j.data.reference ?? reference,
    status: s === 'success' ? 'success' : s === 'failed' ? 'failed' : s === 'abandoned' ? 'abandoned' : 'pending',
    amountKobo: Number(j.data.amount ?? 0),
    currency: String(j.data.currency ?? ''),
    channel: j.data.channel ?? null,
    gatewayResponse: j.data.gateway_response ?? null,
  };
}

/** Paystack signs the raw request body with HMAC-SHA512 using the secret key (header x-paystack-signature). */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
