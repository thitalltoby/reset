import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/rbac';
import { adminGetOrder } from '@/server/orders';
import { PageHeader, OrderBadge, PaymentBadge, Alert, Badge } from '@/components/ui';
import { PrintButton } from '@/components/PrintButton';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { can } from '@/lib/permissions';
import { nextStatuses, ORDER_STATUS_LABELS } from '@/lib/order-flow';
import { formatNaira } from '@/lib/money';
import { fmtDateTime } from '@/lib/format';
import { addNoteAction, changeStatusAction, refundAction } from '../actions';

export const metadata = { title: 'Order' };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff('order.view');
  const o = await adminGetOrder(user, (await params).id);
  if (!o) notFound();
  const next = nextStatuses(o.status, o.fulfilment).filter((s) => s !== 'CANCELLED' || can(user.role, 'order.cancel'));
  const canManage = can(user.role, 'order.manage');
  const refundDue = o.status === 'CANCELLED' && o.paymentStatus === 'PAID';
  const flagged = o.events.some((e) => /mismatch|oversold|refund due|differs/i.test(`${e.label} ${e.note ?? ''}`));
  return (
    <div>
      <PageHeader title={`Order ${o.number}`} eyebrow={<Link href="/admin/orders" className="!no-underline">← Orders</Link> } actions={<PrintButton />}>
        <span className="flex flex-wrap items-center gap-2"><OrderBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /><span className="text-sm">Placed {fmtDateTime(o.createdAt)}</span></span>
      </PageHeader>
      {refundDue && <div className="mb-5"><Alert tone="error"><strong>Refund due.</strong> This order was paid and then cancelled. Refund it in the Paystack dashboard, then record it below.</Alert></div>}
      {flagged && !refundDue && <div className="mb-5"><Alert tone="warn">The history below contains a payment warning. Check it before processing this order.</Alert></div>}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="it"><h2 id="it" className="!text-lg">Items</h2>
            <div className="table-wrap mt-3 !border-0"><table className="table"><thead><tr><th scope="col">Item</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Price</th><th scope="col" className="num">Total</th></tr></thead>
              <tbody>{o.items.map((i) => <tr key={i.id}><td>{i.name}<span className="block text-xs text-muted">{[i.sku, i.packSize].filter(Boolean).join(' · ')}</span></td><td className="num">{i.quantity}</td><td className="num">{formatNaira(i.unitKobo)}</td><td className="num">{formatNaira(i.unitKobo * i.quantity)}</td></tr>)}</tbody></table></div>
            <dl className="ml-auto mt-3 max-w-xs space-y-1.5"><div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(o.subtotalKobo)}</dd></div>{o.discountKobo > 0 && <div className="flex justify-between"><dt>Code {o.couponCode}</dt><dd className="tabular-nums">−{formatNaira(o.discountKobo)}</dd></div>}<div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{formatNaira(o.deliveryKobo)}</dd></div><div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatNaira(o.totalKobo)}</dd></div></dl>
          </section>
          <section className="panel panel-pad" aria-labelledby="hi"><h2 id="hi" className="!text-lg">History</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">{o.events.map((e) => <li key={e.id} className="relative"><span className="absolute -left-[1.7rem] top-2 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" /><p className="font-medium">{e.label} <span className="text-sm font-normal text-muted">· {e.actorLabel}</span></p>{e.note && <p className="text-[.95rem] text-muted">{e.note}</p>}<p className="text-xs text-muted">{fmtDateTime(e.createdAt)}</p></li>)}</ol></section>
        </div>
        <div className="space-y-6">
          {canManage && next.length > 0 && (
            <section className="panel panel-pad" aria-labelledby="mv"><h2 id="mv" className="!text-lg">Move this order on</h2>
              <ActionForm action={changeStatusAction} className="mt-3 space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Field name="to" type="select" label="New status" defaultValue={next[0]} options={next.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))} />
                <Field name="note" type="textarea" rows={2} label="Message or reason" hint="Needed when cancelling. Other notes are shown to the customer." />
                <SubmitButton className="btn btn-primary btn-sm">Update order</SubmitButton>
              </ActionForm></section>
          )}
          {refundDue && can(user.role, 'order.cancel') && (
            <section className="panel panel-pad" aria-labelledby="rf"><h2 id="rf" className="!text-lg">Record the refund</h2>
              <ActionForm action={refundAction} className="mt-3 space-y-3"><input type="hidden" name="orderId" value={o.id} /><Field name="note" label="Refund reference or note" required /><SubmitButton className="btn btn-primary btn-sm">Mark as refunded</SubmitButton></ActionForm></section>
          )}
          <section className="panel panel-pad" aria-labelledby="cu"><h2 id="cu" className="!text-lg">Customer</h2>
            <p className="mt-2 font-medium">{o.customerName}{o.user && <Badge tone="good">Account</Badge>}</p>
            <p className="text-[.95rem]"><a href={`mailto:${o.email}`}>{o.email}</a><br /><a href={`tel:${o.phone}`}>{o.phone}</a></p>
            <h3 className="mt-4 !text-base">{o.fulfilment === 'PICKUP' ? 'Collection' : 'Deliver to'}</h3>
            <p className="whitespace-pre-line text-[.95rem]">{o.fulfilment === 'PICKUP' ? 'Customer collects in store' : [o.shipLine1, o.shipLine2, [o.shipCity, o.shipState].filter(Boolean).join(', '), o.zoneName && `Area: ${o.zoneName}`, o.shipNotes && `Note: ${o.shipNotes}`].filter(Boolean).join('\n')}</p>
            {o.customerNote && <><h3 className="mt-4 !text-base">Customer note</h3><p className="text-[.95rem]">{o.customerNote}</p></>}
            <p className="mt-4 text-sm text-muted">Marketing emails: {o.marketingOptIn ? 'agreed' : 'not agreed'} · Text updates: {o.smsOptIn ? 'agreed' : 'no'}</p>
          </section>
          <section className="panel panel-pad" aria-labelledby="py"><h2 id="py" className="!text-lg">Payment</h2>
            <p className="mt-2 text-[.95rem]">{o.paymentMethod === 'PAYSTACK' ? 'Paystack (card, transfer or USSD)' : 'On delivery or collection'}</p>
            {o.transactions.length > 0 && <ul className="mt-3 space-y-2 text-sm">{o.transactions.map((t) => <li key={t.id} className="rounded-xl bg-mist p-3"><p className="font-mono text-xs">{t.reference}</p><p>{t.status}{t.channel ? ` · ${t.channel}` : ''} · {formatNaira(t.amountKobo)}{t.paidAmountKobo !== null && t.paidAmountKobo !== t.amountKobo ? ` (paid ${formatNaira(t.paidAmountKobo)})` : ''}</p>{t.gatewayMessage && <p className="text-muted">{t.gatewayMessage}</p>}</li>)}</ul>}
          </section>
          {canManage && (
            <section className="panel panel-pad" aria-labelledby="nt"><h2 id="nt" className="!text-lg">Add a staff note</h2>
              <ActionForm action={addNoteAction} className="mt-3 space-y-3" resetOnSuccess><input type="hidden" name="orderId" value={o.id} /><Field name="note" type="textarea" rows={2} label="Note (staff only)" required /><SubmitButton className="btn btn-outline btn-sm">Add note</SubmitButton></ActionForm></section>
          )}
        </div>
      </div>
    </div>
  );
}
