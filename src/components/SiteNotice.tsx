import Link from 'next/link';
import { getSetting } from '@/server/settings';
import { noticeVisible } from '@/lib/notice';
import { Icon } from './Icon';

/** Staff-written announcement above the header. Renders nothing unless switched on and not past its end date. */
export async function SiteNotice() {
  const n = await getSetting('notice');
  if (!noticeVisible(n)) return null;
  const external = n.href.startsWith('https://');
  const cls = 'font-display font-semibold underline underline-offset-4 inline-flex items-center gap-1.5 !text-ink';
  return (
    <aside aria-label="Announcement" className="bg-brand text-ink no-print">
      <div className="container-x py-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[.95rem] text-center">
        <p className="m-0 font-medium">{n.text}</p>
        {n.href && (external
          ? <a href={n.href} rel="noopener noreferrer" className={cls}>{n.linkLabel}<Icon name="arrow" size={16} /></a>
          : <Link href={n.href} className={cls}>{n.linkLabel}<Icon name="arrow" size={16} /></Link>)}
      </div>
    </aside>
  );
}
