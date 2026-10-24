'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { assignPrescription, changePrescriptionStatus, purgePrescriptionFiles } from '@/server/prescriptions';
import { kick } from '@/server/handlers';
import type { RxStatus } from '@/generated/prisma/enums';

export async function rxStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('prescription.review');
    await changePrescriptionStatus(u, str(fd, 'id'), str(fd, 'to') as RxStatus, str(fd, 'note'));
    revalidatePath('/admin/prescriptions', 'layout');
    after(() => kick());
    return 'Updated. The customer has been emailed.';
  });
}

export async function rxAssignAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('prescription.review');
    await assignPrescription(u, str(fd, 'id'), str(fd, 'assigneeId') || null);
    revalidatePath(`/admin/prescriptions/${str(fd, 'id')}`);
    return 'Saved.';
  });
}

export async function rxPurgeAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('prescription.review');
    await purgePrescriptionFiles(u, str(fd, 'id'));
    revalidatePath(`/admin/prescriptions/${str(fd, 'id')}`);
    return 'Uploaded files removed.';
  });
}
