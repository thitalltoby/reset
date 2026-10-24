import type { OrderStatus, Fulfilment, PaymentStatus, RxStatus } from '@/generated/prisma/enums';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting payment',
  PLACED: 'Order received',
  PROCESSING: 'Being prepared',
  READY: 'Ready for collection',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired (not paid)',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Not paid yet',
  PENDING: 'Payment pending',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  CANCELLED: 'Payment cancelled',
  REFUNDED: 'Refunded',
};

/** What staff can do next from each status. Cancelling is allowed until the order is completed. */
export function nextStatuses(status: OrderStatus, fulfilment: Fulfilment): OrderStatus[] {
  switch (status) {
    case 'PLACED': return ['PROCESSING', 'CANCELLED'];
    case 'PROCESSING': return [fulfilment === 'PICKUP' ? 'READY' : 'OUT_FOR_DELIVERY', 'CANCELLED'];
    case 'READY': case 'OUT_FOR_DELIVERY': return ['COMPLETED', 'CANCELLED'];
    default: return [];
  }
}

export const canTransition = (from: OrderStatus, to: OrderStatus, f: Fulfilment) => nextStatuses(from, f).includes(to);

/** The five steps shown to the customer, in order. */
export function trackerSteps(f: Fulfilment): { key: OrderStatus; label: string }[] {
  return [
    { key: 'PLACED', label: 'Order received' },
    { key: 'PROCESSING', label: 'Being prepared' },
    f === 'PICKUP' ? { key: 'READY', label: 'Ready for collection' } : { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
    { key: 'COMPLETED', label: f === 'PICKUP' ? 'Collected' : 'Delivered' },
  ];
}

const ORDER_RANK: Record<OrderStatus, number> = { AWAITING_PAYMENT: -1, PLACED: 0, PROCESSING: 1, READY: 2, OUT_FOR_DELIVERY: 2, COMPLETED: 3, CANCELLED: -1, EXPIRED: -1 };
export const stepIndex = (s: OrderStatus) => ORDER_RANK[s];

export const RX_LABELS: Record<RxStatus, string> = {
  RECEIVED: 'Received',
  IN_REVIEW: 'With the pharmacist',
  NEEDS_INFO: 'We need more information',
  READY: 'Reviewed — see our note',
  DECLINED: 'Unable to process',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const RX_NEXT: Record<RxStatus, RxStatus[]> = {
  RECEIVED: ['IN_REVIEW', 'NEEDS_INFO', 'READY', 'DECLINED'],
  IN_REVIEW: ['NEEDS_INFO', 'READY', 'DECLINED'],
  NEEDS_INFO: ['IN_REVIEW', 'READY', 'DECLINED', 'CANCELLED'],
  READY: ['COMPLETED', 'NEEDS_INFO', 'CANCELLED'],
  DECLINED: [],
  COMPLETED: [],
  CANCELLED: [],
};
