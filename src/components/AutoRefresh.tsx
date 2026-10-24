'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** While a payment is being confirmed, quietly re-read the page every few seconds (for about two minutes). */
export function AutoRefresh({ everyMs = 5000, max = 24 }: { everyMs?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => { n += 1; router.refresh(); if (n >= max) clearInterval(t); }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs, max]);
  return null;
}
