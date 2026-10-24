import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { Alert } from '@/components/ui';
import { trackAction } from './actions';

export const metadata: Metadata = { title: 'Track an order', description: 'Follow your Reset Pharmacy order with your order number and email address.' };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-x py-10 md:py-16">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow">Orders</p>
        <h1 className="mt-1 !text-[2.2rem]">Track an order</h1>
        <p className="lead mt-2">Enter the order number from your confirmation email, such as RP-100123, and the email address you ordered with.</p>
        {sp.error && <div className="mt-4"><Alert tone="error">We could not confirm that payment automatically. Enter your order details to check on it.</Alert></div>}
        <div className="card card-float card-pad mt-6 !border !border-line">
          <ActionForm action={trackAction} className="space-y-4">
            <Field name="number" label="Order number" required placeholder="RP-100123" autoComplete="off" />
            <Field name="email" type="email" label="Email address" required autoComplete="email" />
            <SubmitButton className="btn btn-primary btn-block" pending="Looking…">Find my order</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-5 text-sm text-muted">Have an account? <Link href="/account/orders">See all your orders</Link>.</p>
      </div>
    </div>
  );
}
