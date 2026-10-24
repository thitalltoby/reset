'use server';

import { revalidatePath } from 'next/cache';
import { runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { updateEnquiry } from '@/server/enquiries';
import type { EnquiryStatus } from '@/generated/prisma/enums';

export async function updateEnquiryAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('enquiry.manage');
    await updateEnquiry(u, str(fd, 'id'), { status: str(fd, 'status') as EnquiryStatus, staffNote: str(fd, 'staffNote'), assigneeId: str(fd, 'assigneeId') || null });
    revalidatePath('/admin/enquiries', 'layout');
    return 'Saved.';
  });
}
