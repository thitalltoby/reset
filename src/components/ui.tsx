import Link from 'next/link';
import type { ReactNode } from 'react';
import type { OrderStatus, PaymentStatus, RxStatus, EnquiryStatus } from '@/generated/prisma/enums';
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, RX_LABELS } from '@/lib/order-flow';

export type Tone = 'neutral' | 'info' | 'warn' | 'good' | 'bad';

export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => <span className={`badge badge-${tone}`}>{children}</span>;

const ORDER_TONE: Record<OrderStatus, Tone> = { AWAITING_PAYMENT: 'warn', PLACED: 'info', PROCESSING: 'info', READY: 'good', OUT_FOR_DELIVERY: 'good', COMPLETED: 'good', CANCELLED: 'bad', EXPIRED: 'neutral' };
export const OrderBadge = ({ status }: { status: OrderStatus }) => <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;

const PAY_TONE: Record<PaymentStatus, Tone> = { UNPAID: 'neutral', PENDING: 'warn', PAID: 'good', FAILED: 'bad', CANCELLED: 'neutral', REFUNDED: 'info' };
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAY_TONE[status]}>{PAYMENT_LABELS[status]}</Badge>;

const RX_TONE: Record<RxStatus, Tone> = { RECEIVED: 'info', IN_REVIEW: 'info', NEEDS_INFO: 'warn', READY: 'good', DECLINED: 'bad', COMPLETED: 'good', CANCELLED: 'neutral' };
export const RxBadge = ({ status }: { status: RxStatus }) => <Badge tone={RX_TONE[status]}>{RX_LABELS[status]}</Badge>;

const ENQ_TONE: Record<EnquiryStatus, Tone> = { NEW: 'warn', IN_PROGRESS: 'info', RESOLVED: 'good' };
export const EnquiryBadge = ({ status }: { status: EnquiryStatus }) => <Badge tone={ENQ_TONE[status]}>{status === 'NEW' ? 'New' : status === 'IN_PROGRESS' ? 'In progress' : 'Resolved'}</Badge>;

export function Alert({ tone = 'info', children, role }: { tone?: 'error' | 'ok' | 'info' | 'warn'; children: ReactNode; role?: string }) {
  return <div className={`alert alert-${tone}`} role={role ?? (tone === 'error' ? 'alert' : 'status')}>{children}</div>;
}

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="!text-[1.8rem] md:!text-[2.2rem]">{title}</h1>
        {children && <div className="mt-2 text-muted max-w-2xl">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const Empty = ({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="card card-pad text-center py-10">
    <p className="font-display font-semibold text-lg">{title}</p>
    {children && <div className="text-muted mt-1 max-w-md mx-auto">{children}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">Page {page} of {pages}</span>
      <span className="flex gap-2">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={hrefFor(page - 1)}>Previous</Link> : <span className="btn btn-outline btn-sm" aria-disabled="true">Previous</span>}
        {page < pages ? <Link className="btn btn-outline btn-sm" href={hrefFor(page + 1)}>Next</Link> : <span className="btn btn-outline btn-sm" aria-disabled="true">Next</span>}
      </span>
    </nav>
  );
}

export const Stat = ({ label, value, note, tone, href }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'bad' | 'warn'; href?: string }) => {
  const body = (
    <div className={`panel panel-pad h-full ${tone === 'bad' ? '!border-red-ink border-l-4' : tone === 'warn' ? '!border-l-4 !border-l-brand' : ''}`}>
      <p className="eyebrow">{label}</p>
      <p className="font-display font-semibold text-3xl mt-1 tabular-nums">{value}</p>
      {note && <p className="text-sm text-muted mt-1">{note}</p>}
    </div>
  );
  return href ? <Link href={href} className="block no-underline hover:[&>div]:border-brand">{body}</Link> : body;
};

export function SectionHead({ eyebrow, title, intro, action, light = false }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; action?: ReactNode; light?: boolean }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className={`eyebrow mb-2 ${light ? 'eyebrow-light' : ''}`}>{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p className="lead mt-3">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function qs(params: Record<string, string | number | undefined | null | boolean>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}
