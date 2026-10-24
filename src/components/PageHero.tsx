import type { ReactNode } from 'react';

/** The calm header at the top of content pages: mint panel, mark-bullet eyebrow, one clear headline. */
export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <div className="container-x pt-6 md:pt-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-mint px-6 py-10 md:px-12 md:py-14">
        <div className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 opacity-50" aria-hidden="true" style={{ background: "url('/brand/pattern.svg') center / contain no-repeat" }} />
        <div className="relative max-w-3xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-2 !text-[clamp(2rem,4.6vw,3.3rem)] !leading-[1.08]">{title}</h1>
          {intro && <p className="lead mt-4 !max-w-2xl">{intro}</p>}
          {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function DraftBanner({ reviewed }: { reviewed: boolean }) {
  if (reviewed) return null;
  return (
    <div className="alert alert-warn mb-8" role="note">
      <strong>Draft for legal review.</strong> This page has been written for Reset Pharmacy but has not yet been reviewed by the pharmacy’s legal adviser. It must be reviewed and approved before the shop opens to the public.
    </div>
  );
}
