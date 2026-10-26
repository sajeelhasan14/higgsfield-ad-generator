'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { toResult, type ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { unscheduleAd } from '@/lib/ads/repository';
import { addSlot, removeSlot } from '@/lib/posts/slots';

export async function unscheduleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const id = String(formData.get('adId') ?? '');
    if (!/^\d+$/.test(id)) throw new Error('Invalid ad');
    await unscheduleAd(id);
    refresh();
    return 'Moved back to Review';
  });
}

export async function addSlotAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const time = String(formData.get('time') ?? '');
    await addSlot(time);
    refresh();
    return `Added ${time}`;
  });
}

export async function removeSlotAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await removeSlot(String(formData.get('time') ?? ''));
    refresh();
    return 'Removed';
  });
}
