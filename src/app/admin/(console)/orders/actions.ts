'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { addOrderNote, changeOrderStatus, markRefunded } from '@/server/orders';
import { kick } from '@/server/handlers';
import type { OrderStatus } from '@/generated/prisma/enums';

export async function changeStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff();
    await changeOrderStatus(u, str(fd, 'orderId'), str(fd, 'to') as OrderStatus, str(fd, 'note'));
    revalidatePath('/admin/orders', 'layout');
    after(() => kick());
    return 'Order updated. The customer has been emailed.';
  });
}

export async function addNoteAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff();
    await addOrderNote(u, str(fd, 'orderId'), str(fd, 'note'));
    revalidatePath(`/admin/orders/${str(fd, 'orderId')}`);
    return 'Note added.';
  });
}

export async function refundAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff();
    await markRefunded(u, str(fd, 'orderId'), str(fd, 'note'));
    revalidatePath(`/admin/orders/${str(fd, 'orderId')}`);
    after(() => kick());
    return 'Refund recorded.';
  });
}
