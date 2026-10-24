'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Mark } from './Logo';

export interface GalleryImage { src: string; alt: string }

/** Large product photograph with a thumbnail row when there is more than one picture. */
export function ProductGallery({ images, name, children }: { images: GalleryImage[]; name: string; children?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="pcard-art !m-0 !rounded-[2rem] !aspect-[1/1]">
        {cur
          ? <Image key={cur.src} src={cur.src} alt={cur.alt} fill sizes="(min-width:1024px) 40vw, 100vw" quality={85} loading="eager" fetchPriority="high" className="pcard-photo !p-6" />
          : <span className="pcard-pending" role="img" aria-label={`${name}: photo to be added`}><Mark variant="color" size={64} className="opacity-30" /><span className="text-sm">Photo coming soon</span></span>}
        {children}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2.5" aria-label="More pictures of this product">
          {images.map((g, n) => (
            <li key={g.src}>
              <button type="button" onClick={() => setI(n)} aria-label={`Show picture ${n + 1} of ${images.length}`} aria-current={n === i} className={`relative block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-xl bg-white border-2 transition ${n === i ? 'border-forest' : 'border-line hover:border-forest/50'}`}>
                <Image src={g.src} alt="" fill sizes="72px" quality={85} className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
