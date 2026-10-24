'use server';

import { revalidatePath } from 'next/cache';
import { bool, runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { setSetting } from '@/server/settings';
import { audit } from '@/server/audit';
import { invalid } from '@/server/errors';

const lines = (s: string) => s.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const done = async (u: { id: string; name: string }, key: string) => { await audit({ id: u.id, label: u.name }, `settings.${key}`, 'Setting', key); revalidatePath('/', 'layout'); };

export async function saveCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const email = str(fd, 'email').trim();
    if (email && !EMAIL.test(email)) throw invalid('Enter a valid email address.', { email: 'Invalid email.' });
    const whatsapp = str(fd, 'whatsapp').replace(/[^\d]/g, '');
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) throw invalid('Enter the WhatsApp number with country code, digits only (for example 234…).', { whatsapp: 'Check the number.' });
    const mapUrl = str(fd, 'mapUrl').trim();
    if (mapUrl && !/^https:\/\//.test(mapUrl)) throw invalid('The map link must start with https://', { mapUrl: 'Use an https link.' });
    const g = (k: string) => str(fd, k).trim();
    await setSetting('company', { legalName: g('legalName'), tradingName: g('tradingName') || 'Reset Pharmacy', tagline: g('tagline'), address: g('address'), mapUrl, phone: g('phone'), email, whatsapp, hours: str(fd, 'hours').trim(), registrationNumber: g('registrationNumber'), premisesLicence: g('premisesLicence'), superintendentPharmacist: g('superintendentPharmacist'), instagram: g('instagram'), facebook: g('facebook'), x: g('x'), tiktok: g('tiktok') }, u.id);
    await done(u, 'company');
    return 'Saved. Anything you filled in now appears on the website, emails and receipts. Anything left empty stays hidden.';
  });
}

export async function saveShopAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const hold = Number(str(fd, 'orderHoldMinutes'));
    if (!Number.isInteger(hold) || hold < 10 || hold > 240) throw invalid('Hold time must be between 10 and 240 minutes.', { orderHoldMinutes: 'Between 10 and 240.' });
    const min = Number(str(fd, 'minOrder') || 0);
    if (!Number.isFinite(min) || min < 0) throw invalid('Enter 0 or more.', { minOrder: 'Invalid.' });
    await setSetting('shop', { onlineShop: bool(fd, 'onlineShop'), delivery: bool(fd, 'delivery'), pickup: bool(fd, 'pickup'), payOnDelivery: bool(fd, 'payOnDelivery'), paystack: bool(fd, 'paystack'), prescriptions: bool(fd, 'prescriptions'), orderHoldMinutes: hold, minOrderKobo: Math.round(min * 100), pickupNote: str(fd, 'pickupNote').trim() }, u.id);
    await done(u, 'shop');
    return 'Shop settings saved.';
  });
}

export async function saveNoticeAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const text = str(fd, 'text').trim(); const href = str(fd, 'href').trim(); const endsOn = str(fd, 'endsOn').trim();
    if (bool(fd, 'enabled') && !text) throw invalid('Write the announcement text first.', { text: 'Required.' });
    if (href && !((href.startsWith('/') && !href.startsWith('//')) || /^https:\/\//.test(href))) throw invalid('Use a path such as /shop or an https:// address.', { href: 'Invalid link.' });
    if (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) throw invalid('Enter the last day as a date.', { endsOn: 'Invalid date.' });
    await setSetting('notice', { enabled: bool(fd, 'enabled'), text, href, linkLabel: str(fd, 'linkLabel').trim(), endsOn }, u.id);
    await done(u, 'notice');
    return 'Announcement saved.';
  });
}

export async function saveNotificationsAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const get = (k: string) => lines(str(fd, k));
    const all = { newOrderTo: get('newOrderTo'), prescriptionTo: get('prescriptionTo'), enquiryTo: get('enquiryTo'), lowStockTo: get('lowStockTo') };
    for (const e of Object.values(all).flat()) if (!EMAIL.test(e)) throw invalid(`“${e}” is not a valid email address.`);
    await setSetting('notifications', all, u.id);
    await done(u, 'notifications');
    return 'Saved.';
  });
}

export async function saveSecurityAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    await setSetting('security', { requireStaffMfa: bool(fd, 'requireStaffMfa') }, u.id);
    await done(u, 'security');
    return 'Saved.';
  });
}

export async function saveSeoAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const siteName = str(fd, 'siteName').trim(); const description = str(fd, 'description').trim();
    if (siteName.length < 2) throw invalid('Enter the site name.', { siteName: 'Required.' });
    if (description.length > 200) throw invalid('Keep the description under 200 characters.', { description: 'Too long.' });
    const pages: Record<string, { title: string; description: string }> = {};
    for (const l of lines(str(fd, 'pages')).slice(0, 40)) {
      const [path, title, desc] = l.split('|').map((x) => x.trim());
      if (!path?.startsWith('/') || !title) throw invalid(`Check this line: “${l.slice(0, 60)}”. Format: /path | Title | Description`, { pages: 'Format: /path | Title | Description' });
      pages[path] = { title, description: desc ?? '' };
    }
    await setSetting('seo', { siteName, description, pages }, u.id);
    await done(u, 'seo');
    return 'Saved.';
  });
}

export async function saveLegalAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('settings.manage');
    const reviewedOn = str(fd, 'reviewedOn').trim(); const reviewedBy = str(fd, 'reviewedBy').trim();
    if (reviewedOn && (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || !reviewedBy)) throw invalid('Give the review date and who reviewed the policies, or clear both.', { reviewedBy: 'Required with a date.' });
    await setSetting('legal', { reviewedOn, reviewedBy }, u.id);
    await done(u, 'legal');
    return reviewedOn ? 'Saved. The draft banner is removed from the policy pages.' : 'Saved. The policy pages show a draft banner.';
  });
}
