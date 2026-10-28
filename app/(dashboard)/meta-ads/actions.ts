'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { toResult, type ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { promoteAd, switchPaidAd } from '@/lib/paid-ads/promote';

function idFrom(formData: FormData, name: string): string {
  const id = String(formData.get(name) ?? '');
  if (!/^\d+$/.test(id)) throw new Error('Invalid ad');
  return id;
}

export async function promoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await promoteAd(idFrom(formData, 'adId'), Number(formData.get('dailyBudget')), Number(formData.get('days')));
    refresh();
    return 'Created, switched off. Check it, then press Switch on.';
  });
}

export async function switchPaidAdAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const message = await switchPaidAd(idFrom(formData, 'paidAdId'), formData.get('on') === '1');
    refresh();
    return message;
  });
}
