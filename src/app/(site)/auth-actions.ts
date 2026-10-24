'use server';

import { redirect } from 'next/navigation';
import { runAction, str, bool, safeNext, type FormState } from '@/server/action-utils';
import { verifyLogin, registerCustomer, requestPasswordReset, resetPassword, sendVerificationEmail } from '@/server/auth';
import { createSession, destroySession } from '@/server/session';
import { invalid } from '@/server/errors';
import { env } from '@/server/env';
import { fieldErrors, registerSchema } from '@/lib/validation';
import { db } from '@/server/db';
import { headers } from 'next/headers';
import { startChallenge, completeChallenge, cancelChallenge } from '@/server/mfa';

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const scope = str(fd, 'scope') === 'staff' ? 'staff' : 'customer';
    const r = await verifyLogin(str(fd, 'email'), str(fd, 'password'), scope);
    if (!r.ok) throw invalid(r.error);
    if (scope === 'customer' && !r.emailVerified && env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      await sendVerificationEmail(r.userId);
      throw invalid('Please confirm your email address first. We have sent you a new confirmation link.');
    }
    const next = safeNext(str(fd, 'next'), scope === 'staff' ? '/admin' : '/account');
    if (scope === 'staff' && (await db.user.findUnique({ where: { id: r.userId }, select: { mfaEnabledAt: true } }))?.mfaEnabledAt) {
      // Password accepted. No session yet: the second factor comes first.
      await startChallenge(r.userId, next);
      redirect('/admin/login/verify');
    }
    const ua = (await headers()).get('user-agent');
    await createSession({ id: r.userId, role: r.role }, ua);
    redirect(next);
  });
}

export async function verifyMfaAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const r = await completeChallenge(str(fd, 'code'));
    const ua = (await headers()).get('user-agent');
    await createSession({ id: r.userId, role: r.role }, ua);
    redirect(safeNext(r.next, '/admin'));
  });
}

export async function cancelMfaAction() {
  await cancelChallenge();
  redirect('/admin/login');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const password = str(fd, 'password');
    if (password !== str(fd, 'confirm')) throw invalid('The passwords do not match.', { confirm: 'The passwords do not match.' });
    const parsed = registerSchema.safeParse({ name: str(fd, 'name'), email: str(fd, 'email'), phone: str(fd, 'phone'), password, marketing: bool(fd, 'marketing') });
    if (!parsed.success) throw invalid('Please check the highlighted fields.', fieldErrors(parsed.error));
    await registerCustomer(parsed.data);
    redirect(env.AUTH_REQUIRE_EMAIL_VERIFICATION ? '/register/check-email' : '/login?registered=1');
  });
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    await requestPasswordReset(str(fd, 'email'));
    return 'If an account exists for that address, we have sent a link to reset the password. It is valid for one hour.';
  });
}

export async function resetAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const pw = str(fd, 'password');
    if (pw !== str(fd, 'confirm')) throw invalid('The passwords do not match.', { confirm: 'The passwords do not match.' });
    await resetPassword(str(fd, 'token'), pw);
    redirect(str(fd, 'scope') === 'staff' ? '/admin/login?reset=1' : '/login?reset=1');
  });
}

/** Re-send a verification email without revealing whether the address exists. */
export async function resendVerificationAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const user = await db.user.findUnique({ where: { email: str(fd, 'email').trim().toLowerCase() } });
    if (user && !user.emailVerifiedAt && user.role === 'CUSTOMER') await sendVerificationEmail(user.id);
    return 'If that address has an unconfirmed account, a new confirmation link is on its way.';
  });
}
