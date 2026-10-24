import { requireStaff } from '@/server/rbac';
import { listUsers } from '@/server/users';
import { PageHeader, Badge } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, STAFF_ROLES } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { createUserAction, updateUserAction, resetMfaAction } from './actions';

export const metadata = { title: 'Team' };

export default async function UsersPage() {
  const me = await requireStaff('user.manage');
  const users = await listUsers(me, {});
  const staff = users.filter((u) => u.role !== 'CUSTOMER');
  const roleOpts = STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  return (
    <div>
      <PageHeader title="Team and roles" eyebrow="System">Staff accounts. Changing a role or switching someone off signs them out straight away.</PageHeader>
      <section className="panel panel-pad mb-8" aria-labelledby="add"><h2 id="add" className="!text-lg mb-4">Add a team member</h2>
        <ActionForm action={createUserAction} resetOnSuccess className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field name="name" label="Full name" required /><Field name="email" type="email" label="Work email" required /><Field name="role" type="select" label="Role" defaultValue="STAFF" options={roleOpts} />
          <div><SubmitButton>Send invitation</SubmitButton></div>
        </ActionForm>
      </section>
      <div className="table-wrap"><table className="table"><caption className="sr-only">Team</caption>
        <thead><tr><th scope="col">Person</th><th scope="col">Role and status</th><th scope="col">Two-factor</th></tr></thead>
        <tbody>{staff.map((u) => (
          <tr key={u.id}>
            <td><span className="font-medium">{u.name}</span><span className="block text-xs text-muted">{u.email}</span><span className="block text-xs text-muted">{u.lastLoginAt ? `Last in ${fmtDateTime(u.lastLoginAt)}` : 'Never signed in'}</span></td>
            <td>
              <ActionForm action={updateUserAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="userId" value={u.id} />
                <div className="min-w-44"><label className="sr-only" htmlFor={`r-${u.id}`}>Role for {u.name}</label><select id={`r-${u.id}`} name="role" className="select" defaultValue={u.role}>{roleOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div className="w-36"><label className="sr-only" htmlFor={`a-${u.id}`}>Status for {u.name}</label><select id={`a-${u.id}`} name="isActive" className="select" defaultValue={String(u.isActive)}><option value="true">Active</option><option value="false">Switched off</option></select></div>
                <SubmitButton className="btn btn-outline btn-sm">Save</SubmitButton>
              </ActionForm></td>
            <td>{u.mfaEnabledAt ? <div className="flex flex-col items-start gap-1"><Badge tone="good">On</Badge><ActionForm action={resetMfaAction}><input type="hidden" name="userId" value={u.id} /><SubmitButton className="text-xs underline">Clear it</SubmitButton></ActionForm></div> : <Badge tone="warn">Not set up</Badge>}</td>
          </tr>))}</tbody></table></div>
      <section className="mt-10" aria-labelledby="roles"><h2 id="roles" className="!text-lg mb-4">What each role can do</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{STAFF_ROLES.map((r) => <div key={r} className="panel panel-pad"><h3 className="!text-base">{ROLE_LABELS[r]}</h3><p className="mt-1 text-sm text-muted">{ROLE_DESCRIPTIONS[r]}</p></div>)}</div></section>
    </div>
  );
}
