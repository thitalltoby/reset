/* eslint-disable @next/next/no-img-element */
const SRC = { color: '/brand/logo.svg', white: '/brand/logo-white.svg', mint: '/brand/logo-mint.svg', deep: '/brand/logo-deep.svg' } as const;

/** The supplied Reset Pharmacy logo (traced from the identity deck). Pick the variant that suits the background. */
export function Logo({ variant = 'color', height = 40, className = '' }: { variant?: keyof typeof SRC; height?: number; className?: string }) {
  return <img src={SRC[variant]} alt="Reset Pharmacy" width={Math.round((height * 523) / 194)} height={height} className={className} style={{ height, width: 'auto' }} />;
}

export function Mark({ variant = 'color', size = 24, className = '' }: { variant?: 'color' | 'white' | 'mint' | 'deep'; size?: number; className?: string }) {
  const src = variant === 'color' ? '/brand/mark.svg' : `/brand/mark-${variant}.svg`;
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className={className} />;
}
