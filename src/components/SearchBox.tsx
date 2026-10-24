'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from './Icon';
import { formatNaira } from '@/lib/money';

interface Result { products: { slug: string; name: string; priceKobo: number; classification: string; packSize: string | null }[]; categories: { slug: string; name: string }[] }

/** Shop search with suggestions as you type. Works without JavaScript too: it is a plain GET form to /shop. */
export function SearchBox({ initial = '', autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return; // the list is hidden for short input (see showList), so stale results are never shown
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (r.ok) { setRes(await r.json()); setActive(-1); }
      } catch { /* aborted or offline: keep the plain search working */ }
    }, 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const items: { href: string; label: string; meta?: string }[] = res
    ? [
        ...res.categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name, meta: 'Category' })),
        ...res.products.map((p) => ({ href: `/product/${p.slug}`, label: p.packSize ? `${p.name} · ${p.packSize}` : p.name, meta: p.classification === 'OTC' ? formatNaira(p.priceKobo) : 'Ask the pharmacist' })),
      ]
    : [];
  const showList = open && q.trim().length >= 2 && res !== null;

  return (
    <div ref={box} className="search-pill" role="search">
      <form action="/shop" method="get" onSubmit={(e) => { if (active >= 0 && items[active]) { e.preventDefault(); setOpen(false); router.push(items[active]!.href); } else setOpen(false); }}>
        <span className="s-ic"><Icon name="search" size={20} /></span>
        <input
          type="search" name="q" value={q} autoFocus={autoFocus} autoComplete="off" enterKeyHint="search" maxLength={60}
          placeholder="Search medicines, vitamins, baby care…" aria-label="Search the shop"
          role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
          }}
        />
      </form>
      {showList && (
        <div className="suggest" id={listId} role="listbox" aria-label="Suggestions">
          {items.length === 0 && <p className="px-4 py-3 text-muted">Nothing found for “{q.trim()}”. Try a different word, or <Link href="/contact" onClick={() => setOpen(false)}>ask the pharmacy</Link>.</p>}
          {items.map((it, i) => (
            <Link key={it.href} id={`${listId}-${i}`} href={it.href} role="option" aria-selected={i === active} onClick={() => setOpen(false)}>
              <span className="font-medium">{it.label}</span><span className="text-sm text-muted whitespace-nowrap">{it.meta}</span>
            </Link>
          ))}
          {items.length > 0 && <Link href={`/shop?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)} className="!justify-start !gap-2 font-semibold text-forest"><Icon name="search" size={16} />See all results for “{q.trim()}”</Link>}
        </div>
      )}
    </div>
  );
}
