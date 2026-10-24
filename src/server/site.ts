import 'server-only';
import { cache } from 'react';
import { env } from './env';
import { getSetting } from './settings';

/** Settings the public pages read on nearly every request. Cached per request. */
export const getSite = cache(async () => {
  const [company, shop, seo] = await Promise.all([getSetting('company'), getSetting('shop'), getSetting('seo')]);
  return { company, shop, seo, demo: env.SITE_MODE === 'demo', appUrl: env.APP_URL };
});

/** WhatsApp click-to-chat link, only when the pharmacy has given a number. */
export const whatsappHref = (digits: string, text = 'Hello Reset Pharmacy') => (/^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null);
export const telHref = (phone: string) => (phone.replace(/[^\d+]/g, '').length >= 7 ? `tel:${phone.replace(/[^\d+]/g, '')}` : null);
