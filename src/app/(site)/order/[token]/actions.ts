'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { runAction, type FormState } from '@/server/action-utils';
import { cancelUnpaidOrder, getOrderByToken, startPayment } from '@/server/orders';
import { invalid } from '@/server/errors';

export async function payNowAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const o = await getOrderByToken(String(fd.get('token') ?? ''));
    if (!o) throw invalid('Order not found.');
    redirect(await startPayment(o.id));
  });
}

export async function cancelOrderAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const token = String(fd.get('token') ?? '');
    await cancelUnpaidOrder(token);
    revalidatePath(`/order/${token}`);
    return 'Your order has been cancelled. Nothing was charged.';
  });
}
