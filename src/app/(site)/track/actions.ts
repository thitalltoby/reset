'use server';

import { redirect } from 'next/navigation';
import { runAction, str, type FormState } from '@/server/action-utils';
import { findOrderForTracking } from '@/server/orders';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { AppError, invalid } from '@/server/errors';

export async function trackAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    if (!(await rateLimit(`track:ip:${await clientIp()}`, 15, 600))) throw new AppError('RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.');
    const number = str(fd, 'number').trim();
    const email = str(fd, 'email').trim();
    if (!number || !email) throw invalid('Enter your order number and email address.');
    const o = await findOrderForTracking(number, email);
    if (!o) throw invalid('We could not find an order with those details. Check the number in your confirmation email, and use the email address you ordered with.');
    redirect(`/order/${o.trackToken}`);
  });
}
