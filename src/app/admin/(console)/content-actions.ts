'use server';

import { revalidatePath } from 'next/cache';
import { bool, files, runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { deleteArticle, deleteCoupon, deleteFaq, deletePromotion, deleteService, deleteTestimonial, deleteZone, saveArticle, saveCoupon, saveFaq, savePromotion, saveService, saveTestimonial, saveZone } from '@/server/content';
import { saveMedia } from '@/server/media';

const done = (paths: string[]) => { for (const p of paths) revalidatePath(p); revalidatePath('/', 'layout'); };
const idOf = (fd: FormData) => str(fd, 'id') || null;

export async function saveServiceAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('content.manage');
    await saveService(u, idOf(fd), { title: str(fd, 'title'), slug: str(fd, 'slug'), summary: str(fd, 'summary'), description: str(fd, 'description'), benefits: str(fd, 'benefits'), conditions: str(fd, 'conditions'), action: str(fd, 'action') || 'ENQUIRY', ctaLabel: str(fd, 'ctaLabel') || 'Ask about this service', icon: str(fd, 'icon') || 'pill', confirmed: bool(fd, 'confirmed'), sortOrder: str(fd, 'sortOrder') || 0 });
    done(['/admin/services']);
    return 'Saved.';
  });
}
export async function deleteServiceAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('content.manage'); await deleteService(u, str(fd, 'id')); done(['/admin/services']); return 'Deleted.'; });
}

export async function saveArticleAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('content.manage');
    let image = str(fd, 'image');
    const up = files(fd, 'photo')[0];
    if (up) image = (await saveMedia(u, up, str(fd, 'photoAlt') || str(fd, 'title'))).id;
    await saveArticle(u, idOf(fd), { title: str(fd, 'title'), slug: str(fd, 'slug'), excerpt: str(fd, 'excerpt'), body: str(fd, 'body'), category: str(fd, 'category') || 'Everyday health', art: str(fd, 'art') || 'leaf', image, status: str(fd, 'status') || 'DRAFT', needsReview: !bool(fd, 'reviewed'), reviewedBy: str(fd, 'reviewedBy'), readMinutes: str(fd, 'readMinutes') || 4, sources: str(fd, 'sources') });
    done(['/admin/articles']);
    return 'Saved.';
  });
}
export async function deleteArticleAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('content.manage'); await deleteArticle(u, str(fd, 'id')); done(['/admin/articles']); return 'Deleted.'; });
}

export async function saveFaqAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('content.manage');
    await saveFaq(u, idOf(fd), { question: str(fd, 'question'), answer: str(fd, 'answer'), category: str(fd, 'category') || 'General', sortOrder: str(fd, 'sortOrder') || 0, visible: bool(fd, 'visible') });
    done(['/admin/faqs']);
    return 'Saved.';
  });
}
export async function deleteFaqAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('content.manage'); await deleteFaq(u, str(fd, 'id')); done(['/admin/faqs']); return 'Deleted.'; });
}

export async function saveTestimonialAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('content.manage');
    await saveTestimonial(u, idOf(fd), { name: str(fd, 'name'), detail: str(fd, 'detail'), quote: str(fd, 'quote'), approved: bool(fd, 'approved'), sortOrder: str(fd, 'sortOrder') || 0 });
    done(['/admin/testimonials']);
    return 'Saved.';
  });
}
export async function deleteTestimonialAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('content.manage'); await deleteTestimonial(u, str(fd, 'id')); done(['/admin/testimonials']); return 'Deleted.'; });
}

export async function savePromotionAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('promo.manage');
    await savePromotion(u, idOf(fd), { title: str(fd, 'title'), body: str(fd, 'body'), ctaLabel: str(fd, 'ctaLabel') || 'Shop now', ctaHref: str(fd, 'ctaHref') || '/shop', tone: str(fd, 'tone') || 'MINT', couponCode: str(fd, 'couponCode'), startsAt: str(fd, 'startsAt'), endsAt: str(fd, 'endsAt'), visible: bool(fd, 'visible'), sortOrder: str(fd, 'sortOrder') || 0 });
    done(['/admin/promotions']);
    return 'Saved.';
  });
}
export async function deletePromotionAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('promo.manage'); await deletePromotion(u, str(fd, 'id')); done(['/admin/promotions']); return 'Deleted.'; });
}

export async function saveCouponAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('promo.manage');
    await saveCoupon(u, idOf(fd), { code: str(fd, 'code'), description: str(fd, 'description'), kind: str(fd, 'kind') || 'PERCENT', value: str(fd, 'value'), minSubtotal: str(fd, 'minSubtotal') || 0, startsAt: str(fd, 'startsAt'), endsAt: str(fd, 'endsAt'), usageLimit: str(fd, 'usageLimit'), active: bool(fd, 'active') });
    done(['/admin/promotions']);
    return 'Saved.';
  });
}
export async function deleteCouponAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('promo.manage'); const m = await deleteCoupon(u, str(fd, 'id')); done(['/admin/promotions']); return m || 'Deleted.'; });
}

export async function saveZoneAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('promo.manage');
    await saveZone(u, idOf(fd), { name: str(fd, 'name'), areas: str(fd, 'areas'), fee: str(fd, 'fee'), freeOver: str(fd, 'freeOver'), etaText: str(fd, 'etaText'), active: bool(fd, 'active'), sortOrder: str(fd, 'sortOrder') || 0 });
    done(['/admin/delivery']);
    return 'Saved.';
  });
}
export async function deleteZoneAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { const u = await actionStaff('promo.manage'); await deleteZone(u, str(fd, 'id')); done(['/admin/delivery']); return 'Deleted.'; });
}
