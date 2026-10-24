import { requireCustomer } from '@/server/rbac';
import { db } from '@/server/db';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { Icon } from '@/components/Icon';
import { changePasswordAction, deleteAccountAction, updateProfileAction } from '../actions';

export const metadata = { title: 'Profile & privacy' };

export default async function Profile() {
  const u = await requireCustomer('/account/profile');
  const me = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, phone: true, marketingOptInAt: true } });
  return (
    <div className="space-y-6">
      <section className="card card-pad" aria-labelledby="pf"><h2 id="pf" className="!text-xl">Your details</h2>
        <ActionForm action={updateProfileAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field name="name" label="Full name" required defaultValue={me.name} /><Field name="phone" type="tel" label="Phone" defaultValue={me.phone ?? ''} /><Field name="email" type="email" label="Email address" defaultValue={me.email} readOnly hint="To change your email address, contact us." className="sm:col-span-2" /></div>
          <Field name="marketing" type="checkbox" label="Email me offers and health tips" defaultValue={!!me.marketingOptInAt} hint="Order and prescription messages are always sent." />
          <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
        </ActionForm></section>
      <section className="card card-pad" aria-labelledby="pw"><h2 id="pw" className="!text-xl">Password</h2>
        <ActionForm action={changePasswordAction} className="mt-4 space-y-4" resetOnSuccess>
          <Field name="current" type="password" label="Current password" required autoComplete="current-password" />
          <div className="grid gap-4 sm:grid-cols-2"><Field name="next" type="password" label="New password" required autoComplete="new-password" hint="At least 10 characters, with a letter and a number." /><Field name="confirm" type="password" label="Confirm new password" required autoComplete="new-password" /></div>
          <SubmitButton className="btn btn-primary btn-sm">Change password</SubmitButton>
        </ActionForm></section>
      <section className="card card-pad" aria-labelledby="dt"><h2 id="dt" className="!text-xl">Your data</h2>
        <p className="mt-2 text-muted">Download a copy of the information we hold about you, or close your account. Orders are kept, without a link to you, for the pharmacy’s financial and regulatory records.</p>
        <a href="/account/export" className="btn btn-outline btn-sm mt-4"><Icon name="download" size={16} />Download my data</a>
        <details className="mt-6 rounded-2xl border border-line p-4"><summary className="cursor-pointer font-display font-semibold text-red-ink">Close my account</summary>
          <ActionForm action={deleteAccountAction} className="mt-4 space-y-4">
            <p className="text-sm text-muted">This removes your login, saved addresses, favourites and prescription files. It cannot be undone.</p>
            <Field name="password" type="password" label="Your password" required autoComplete="current-password" />
            <Field name="confirm" label="Type DELETE to confirm" required autoComplete="off" />
            <SubmitButton className="btn btn-danger btn-sm" pending="Closing…">Close my account</SubmitButton>
          </ActionForm></details></section>
    </div>
  );
}
