'use server';

import { runAction, str, type FormState } from '@/server/action-utils';
import { submitEnquiry } from '@/server/enquiries';

export async function contactAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const r = await submitEnquiry({
      type: str(fd, 'type') || 'GENERAL', name: str(fd, 'name'), email: str(fd, 'email'), phone: str(fd, 'phone'), message: str(fd, 'message'),
      productSlug: str(fd, 'productSlug'), serviceSlug: str(fd, 'serviceSlug'),
    }, str(fd, 'website'));
    return `Thank you. Your message is with the team (reference ${r.number}). We will reply by email.`;
  });
}
