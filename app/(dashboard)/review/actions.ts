'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { toResult, type ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { approveAd } from '@/lib/ads/approve';
import { refreshDesign } from '@/lib/ads/generate';
import { deleteAd, requeueAd, updateCaption } from '@/lib/ads/repository';
import { formatSlotTime } from '@/lib/format';
import { deleteFolder } from '@/lib/storage';

function adIdFrom(formData: FormData): string {
  const id = String(formData.get('adId') ?? '');
  if (!/^\d+$/.test(id)) throw new Error('Invalid ad');
  return id;
}

export async function approveAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const at = await approveAd(adIdFrom(formData));
    refresh();
    return `Scheduled for ${formatSlotTime(at)}`;
  });
}

export async function regenerateAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await requeueAd(adIdFrom(formData));
    refresh();
    return 'Generating a new picture…';
  });
}

/** Redraws the image and caption from today's Shopify data, keeping the AI picture (free). */
export async function refreshDesignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await refreshDesign(adIdFrom(formData));
    refresh();
    return 'Design refreshed';
  });
}

export async function deleteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const id = adIdFrom(formData);
    await deleteAd(id);
    await deleteFolder(`ads/${id}`);
    refresh();
    return 'Deleted';
  });
}

export async function saveCaptionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const caption = String(formData.get('caption') ?? '').trim();
    if (caption.length > 2200) throw new Error('Instagram captions can be at most 2,200 characters');
    await updateCaption(adIdFrom(formData), caption);
    refresh();
    return 'Caption saved';
  });
}
