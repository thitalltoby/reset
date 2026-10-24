/**
 * Line illustrations used when a product has no photograph. One consistent style: Deep Forest outlines, white and
 * Soft Mint fills, a Reset Green accent. They are generic pictures of a kind of product, not pictures of a specific item.
 */
const F = '#006B45'; // forest line
const G = '#00B86B'; // brand green
const M = '#DDF7E9'; // mint
const W = '#FFFFFF';

const ART: Record<string, React.ReactNode> = {
  pill: <>
    <circle cx="38" cy="56" r="24" fill={W} /><path d="M14 56a24 24 0 0 1 48 0z" fill={M} stroke="none" /><circle cx="38" cy="56" r="24" fill="none" /><path d="M14 56h48" />
    <circle cx="68" cy="28" r="12" fill={G} /><path d="M60 28h16" />
  </>,
  capsule: <>
    <g transform="rotate(-35 48 48)"><rect x="14" y="34" width="68" height="28" rx="14" fill={W} /><path d="M48 34h20a14 14 0 0 1 0 28H48z" fill={G} stroke="none" /><rect x="14" y="34" width="68" height="28" rx="14" fill="none" /><path d="M48 34v28" /></g>
  </>,
  bottle: <>
    <rect x="30" y="14" width="36" height="14" rx="4" fill={G} /><rect x="35" y="28" width="26" height="6" fill={W} />
    <rect x="24" y="34" width="48" height="52" rx="12" fill={W} /><rect x="24" y="48" width="48" height="24" fill={M} stroke="none" /><path d="M24 48h48M24 72h48" />
    <path d="M44 54v12M38 60h12" stroke={G} strokeWidth="3.4" />
  </>,
  vitamin: <>
    <rect x="30" y="12" width="36" height="14" rx="4" fill={F} /><rect x="24" y="26" width="48" height="60" rx="12" fill={W} />
    <circle cx="48" cy="56" r="14" fill={M} /><path d="M48 49v14M41 56h14" stroke={G} strokeWidth="3.4" />
  </>,
  syrup: <>
    <rect x="38" y="10" width="20" height="10" rx="3" fill={G} /><path d="M40 20v10l-14 10v40a6 6 0 0 0 6 6h32a6 6 0 0 0 6-6V40L56 30V20" fill={W} />
    <path d="M26 56h44v24a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6z" fill={M} stroke="none" /><path d="M26 56h44" />
    <path d="M36 44h10M36 66h14" /><path d="M58 66v0" />
  </>,
  tube: <>
    <path d="M30 72 38 14h20l8 58z" fill={W} /><path d="M33 56l2-14h26l2 14z" fill={M} stroke="none" /><path d="M33.5 56h29" />
    <rect x="26" y="72" width="44" height="8" rx="2" fill={G} /><rect x="38" y="8" width="20" height="8" rx="2" fill={F} />
    <path d="M48 24v10M43 29h10" stroke={G} strokeWidth="3" />
  </>,
  drops: <>
    <rect x="42" y="8" width="16" height="12" rx="3" fill={F} /><path d="M46 20v10h8V20" fill={W} />
    <path d="M36 30h28v8H36z" fill={G} /><rect x="30" y="38" width="40" height="46" rx="10" fill={W} /><path d="M30 56h40v18a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10z" fill={M} stroke="none" /><path d="M30 56h40" />
    <path d="M78 28c-5 7-8 10-8 14a8 8 0 0 0 16 0c0-4-3-7-8-14z" fill={G} transform="translate(-8 -4) scale(.8)" />
  </>,
  spray: <>
    <rect x="38" y="6" width="22" height="8" rx="3" fill={G} /><path d="M44 14h10v10H44z" fill={W} /><rect x="32" y="24" width="34" height="14" rx="4" fill={F} />
    <rect x="28" y="38" width="42" height="48" rx="10" fill={W} /><path d="M28 60h42v16a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10z" fill={M} stroke="none" /><path d="M28 60h42" />
    <path d="M70 12h8M70 18h12M70 24h8" stroke={G} />
  </>,
  sachet: <>
    <path d="M24 22l8-8 8 8 8-8 8 8 8-8 8 8v52l-8 8-8-8-8 8-8-8-8 8-8-8z" fill={W} />
    <path d="M24 46h48v24H24z" fill={M} stroke="none" /><path d="M24 46h48" /><path d="M34 32h28" /><circle cx="48" cy="60" r="6" fill={G} />
  </>,
  thermometer: <>
    <rect x="40" y="10" width="16" height="52" rx="8" fill={W} /><circle cx="48" cy="72" r="13" fill={W} /><circle cx="48" cy="72" r="7" fill={G} stroke="none" /><path d="M48 66V26" stroke={G} strokeWidth="4" />
    <path d="M62 22h8M62 32h8M62 42h8" />
  </>,
  bandage: <>
    <g transform="rotate(-40 48 48)"><rect x="8" y="32" width="80" height="32" rx="16" fill={M} /><rect x="32" y="32" width="32" height="32" fill={W} /><path d="M32 32v32M64 32v32" />
    <circle cx="19" cy="42" r="1.6" fill={F} /><circle cx="19" cy="54" r="1.6" fill={F} /><circle cx="77" cy="42" r="1.6" fill={F} /><circle cx="77" cy="54" r="1.6" fill={F} /><path d="M48 40v16M40 48h16" stroke={G} strokeWidth="3.4" /></g>
  </>,
  mask: <>
    <path d="M20 34c0-4 4-6 8-6h40c4 0 8 2 8 6v22c0 10-12 16-28 16S20 66 20 56z" fill={W} /><path d="M20 42h56M20 50h56M20 58h56" stroke={G} />
    <path d="M20 38c-10 0-12 14-4 18M76 38c10 0 12 14 4 18" fill="none" />
  </>,
  tooth: <>
    <path d="M30 16c-10 0-16 8-16 18 0 8 4 12 6 22 1.600 8 3 24 8 24 6 0 4-16 10-16s4 16 10 16c5 0 6.400-16 8-24 2-10 6-14 6-22 0-10-6-18-16-18-4 0-6 2-8 2s-4-2-8-2z" fill={W} transform="translate(8 0) scale(.9)" />
    <path d="M36 30c3-4 8-4 11-2" stroke={G} strokeWidth="3" />
  </>,
  baby: <>
    <path d="M42 6h12v6l4 6H38l4-6z" fill={G} /><rect x="38" y="18" width="20" height="8" rx="2" fill={F} />
    <rect x="28" y="26" width="40" height="60" rx="14" fill={W} /><path d="M28 50h40v24a14 14 0 0 1-14 12H42a14 14 0 0 1-14-12z" fill={M} stroke="none" /><path d="M28 50h40M28 62h12M28 74h12" />
  </>,
  leaf: <>
    <path d="M18 78C14 40 38 14 80 14c2 40-20 66-54 64" fill={M} /><path d="M18 78C34 56 50 40 68 28" stroke={G} strokeWidth="3.4" /><path d="M40 62c0-8 4-14 10-18M52 52c0-6 4-10 8-12" />
  </>,
  sun: <>
    <circle cx="48" cy="48" r="17" fill={G} /><path d="M48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M72 24l-7 7M31 65l-7 7" />
  </>,
  drop: <>
    <path d="M48 10C34 30 22 42 22 58a26 26 0 0 0 52 0C74 42 62 30 48 10z" fill={W} /><path d="M30 60a18 18 0 0 0 18 18c10 0 18-8 18-18z" fill={M} stroke="none" /><path d="M36 54c0-6 4-10 8-14" stroke={G} strokeWidth="3.4" />
  </>,
  heart: <>
    <path d="M48 82S14 62 14 38a18 18 0 0 1 34-8 18 18 0 0 1 34 8c0 24-34 44-34 44z" fill={M} /><path d="M24 48h14l6-12 8 22 6-10h12" stroke={G} strokeWidth="3.2" />
  </>,
  test: <>
    <rect x="14" y="30" width="68" height="36" rx="10" fill={W} /><rect x="24" y="40" width="26" height="16" rx="4" fill={M} /><circle cx="64" cy="48" r="7" fill={G} /><path d="M32 48h10" />
  </>,
  firstaid: <>
    <rect x="12" y="28" width="72" height="50" rx="12" fill={W} /><path d="M34 28v-8a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v8" />
    <path d="M42 40h12v8h8v12h-8v8H42v-8h-8V48h8z" fill={G} />
  </>,
  eye: <>
    <path d="M8 48s14-22 40-22 40 22 40 22-14 22-40 22S8 48 8 48z" fill={W} /><circle cx="48" cy="48" r="13" fill={M} /><circle cx="48" cy="48" r="6" fill={G} />
  </>,
  bone: <>
    <g transform="rotate(-45 48 48)"><circle cx="18" cy="40" r="9" fill={W} /><circle cx="18" cy="56" r="9" fill={W} /><circle cx="78" cy="40" r="9" fill={W} /><circle cx="78" cy="56" r="9" fill={W} /><rect x="20" y="41" width="56" height="14" fill={W} stroke="none" /><path d="M20 41h56M20 55h56" stroke={F} /><path d="M40 48h16" stroke={G} strokeWidth="3.4" /></g>
  </>,
};

export const ART_KEYS = Object.keys(ART);
export const ART_LABELS: Record<string, string> = {
  pill: 'Tablets', capsule: 'Capsule', bottle: 'Bottle', vitamin: 'Vitamins', syrup: 'Syrup or liquid', tube: 'Cream or gel', drops: 'Drops', spray: 'Spray', sachet: 'Sachet', thermometer: 'Thermometer',
  bandage: 'Plaster or dressing', mask: 'Mask or protection', tooth: 'Oral care', baby: 'Baby and child', leaf: 'Natural or herbal', sun: 'Sun care', drop: 'Hydration or skin', heart: 'Heart and blood pressure',
  test: 'Test kit or device', firstaid: 'First aid', eye: 'Eye care', bone: 'Bones and joints',
};

/** A decorative picture of a kind of product. The product name beside it carries the meaning, so it is hidden from screen readers. */
export function ProductArt({ kind, size = 96, className = '' }: { kind: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" stroke={F} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {ART[kind] ?? ART.pill}
    </svg>
  );
}
