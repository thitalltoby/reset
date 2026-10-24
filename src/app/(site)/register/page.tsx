import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { AuthCard } from '@/components/AuthCard';
import { registerAction } from '../auth-actions';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Create an account" intro="Reorder in a couple of taps, follow your orders and keep your addresses and favourites." footer={<p>Already registered? <Link href="/login">Sign in</Link>. You never need an account to check out.</p>}>
      <ActionForm action={registerAction} className="space-y-4">
        <Field name="name" label="Full name" required autoComplete="name" />
        <Field name="email" type="email" label="Email address" required autoComplete="email" defaultValue={sp.email ?? ''} hint="Orders you placed as a guest with this address will appear in your account once you confirm it." />
        <Field name="phone" type="tel" label="Phone number (optional)" autoComplete="tel" />
        <Field name="password" type="password" label="Password" required autoComplete="new-password" hint="At least 10 characters, with a letter and a number." />
        <Field name="confirm" type="password" label="Confirm password" required autoComplete="new-password" />
        <Field name="marketing" type="checkbox" label="Send me offers and health tips by email (optional)" hint="Order and prescription messages are always sent. You can change this at any time in your account." />
        <p className="text-sm text-muted">By creating an account you agree to our <Link href="/terms">terms of sale</Link> and have read our <Link href="/privacy">privacy notice</Link>.</p>
        <SubmitButton className="btn btn-primary btn-block" pending="Creating account…">Create account</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
