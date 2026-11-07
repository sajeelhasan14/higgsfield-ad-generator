'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { toResult, type ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { pauseEverything, resumeEverything } from '@/lib/autopilot/act';
import { setIdeaStatus } from '@/lib/autopilot/repository';
import { parseSettings, saveSettings } from '@/lib/autopilot/settings';

export async function pauseEverythingAction(): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const message = await pauseEverything();
    refresh();
    return message;
  });
}

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const text = (name: string) => String(formData.get(name) ?? '');
    await saveSettings(
      parseSettings({
        mode: text('mode'),
        weeklyAds: text('weeklyAds'),
        maxCostPerSale: text('maxCostPerSale'),
        autoPost: text('autoPost'),
      }),
    );
    refresh();
    return 'Saved. The worker picks this up within the hour.';
  });
}

function ideaIdFrom(formData: FormData): string {
  const id = String(formData.get('ideaId') ?? '');
  if (!/^\d+$/.test(id)) throw new Error('Invalid idea');
  return id;
}

export async function useIdeaAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await setIdeaStatus(ideaIdFrom(formData), 'approved');
    refresh();
    return 'Added to the caption angles';
  });
}

export async function dismissIdeaAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    await setIdeaStatus(ideaIdFrom(formData), 'dismissed');
    refresh();
    return 'Dismissed';
  });
}

export async function resumeEverythingAction(): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const message = await resumeEverything();
    refresh();
    return message;
  });
}
