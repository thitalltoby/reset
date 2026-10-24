import type { ReactNode } from 'react';
import Image from 'next/image';
import { Logo } from './Logo';

export function AuthCard({ title, intro, children, footer, staff = false }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode; staff?: boolean }) {
  return (
    <div className={staff ? 'min-h-screen bg-mist grid place-items-center px-4 py-10' : 'container-x py-10 md:py-16'}>
      <div className={staff ? 'w-full max-w-md' : 'mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_26rem]'}>
        {!staff && (
          <div className="hidden md:block relative rounded-[2rem] bg-mint overflow-hidden min-h-[30rem]">
            <div className="absolute inset-0 bg-pattern opacity-60" aria-hidden="true" />
            <Image src="/photos/nurse.webp" alt="" width={520} height={640} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[92%] w-auto object-contain" loading="eager" fetchPriority="high" />
            <p className="absolute left-6 top-6 right-6 font-display text-2xl font-semibold text-forest-700 text-balance">A fresh start to feeling better.</p>
          </div>
        )}
        <div>
          {staff && <div className="mb-6"><Logo height={40} /></div>}
          <h1 className="!text-[2rem]">{title}</h1>
          {intro && <p className="mt-2 text-muted">{intro}</p>}
          <div className="card card-float card-pad mt-6 !border !border-line">{children}</div>
          {footer && <div className="mt-5 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
