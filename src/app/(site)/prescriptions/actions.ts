'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { bool, files, runAction, str, type FormState } from '@/server/action-utils';
import { respondToPrescription, submitPrescription } from '@/server/prescriptions';
import { getSessionUser } from '@/server/session';

export async function submitPrescriptionAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await getSessionUser();
    const r = await submitPrescription({
      name: str(fd, 'name'), email: str(fd, 'email'), phone: str(fd, 'phone'), preference: str(fd, 'preference'), note: str(fd, 'note'),
      consent: bool(fd, 'consent'), files: files(fd, 'files'), userId: u?.role === 'CUSTOMER' ? u.id : null,
    });
    redirect(`/prescriptions/${r.token}?new=1`);
  });
}

export async function replyPrescriptionAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const token = str(fd, 'token');
    await respondToPrescription(token, str(fd, 'note'), files(fd, 'files'));
    revalidatePath(`/prescriptions/${token}`);
    return 'Thank you. The pharmacist has your reply.';
  });
}
