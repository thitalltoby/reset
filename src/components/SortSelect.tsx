'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function SortSelect({ options, value }: { options: { value: string; label: string }[]; value: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[.92rem]">
      <span className="text-muted">Sort by</span>
      <select className="select !w-auto !min-h-[2.5rem] !py-1.5" value={value} onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        if (e.target.value === 'relevance') next.delete('sort'); else next.set('sort', e.target.value);
        next.delete('page');
        router.push(`${path}${next.toString() ? `?${next}` : ''}`);
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
