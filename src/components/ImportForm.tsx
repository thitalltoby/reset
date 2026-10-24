'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { importAction, type ImportState } from '@/app/admin/(console)/products/actions';
import { Alert, Badge } from './ui';

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button type="submit" name="mode" value="check" className="btn btn-outline" disabled={pending}>{pending ? 'Working…' : 'Check the file'}</button>
      <button type="submit" name="mode" value="apply" className="btn btn-primary" disabled={pending}>Import now</button>
    </div>
  );
}

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(importAction, null);
  const r = state?.report;
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      <div><label htmlFor="csv" className="label">CSV file</label><input id="csv" name="csv" type="file" accept=".csv,text/csv" required className="input !py-2" /></div>
      <Buttons />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {r && (
        <div className="space-y-3" aria-live="polite">
          <Alert tone={r.errors ? 'warn' : 'ok'}>
            {r.applied ? <strong>Imported. </strong> : <strong>Checked, nothing changed yet. </strong>}
            {r.created} to create, {r.updated} to update{r.errors ? `, ${r.errors} row${r.errors === 1 ? '' : 's'} with problems` : ''}.
            {!r.applied && r.errors > 0 && ' Rows with problems are skipped when you import.'}
          </Alert>
          <div className="table-wrap"><table className="table"><thead><tr><th scope="col">Line</th><th scope="col">SKU</th><th scope="col">Action</th><th scope="col">Problems</th></tr></thead>
            <tbody>{r.rows.slice(0, 300).map((x) => <tr key={x.line}><td>{x.line}</td><td>{x.sku}</td><td>{x.errors.length ? <Badge tone="bad">Skipped</Badge> : <Badge tone={x.action === 'create' ? 'good' : 'info'}>{x.action === 'create' ? 'New' : 'Update'}</Badge>}</td><td className="text-sm text-red-ink">{x.errors.join(' ')}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </form>
  );
}
