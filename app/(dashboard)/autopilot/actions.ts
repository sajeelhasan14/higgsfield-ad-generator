'use server';

// Every action starts with requireLogin(): server actions can be called by anyone who can reach the app.
import { refresh } from 'next/cache';
import { toResult, type ActionResult } from '@/lib/action-result';
import { requireLogin } from '@/lib/auth';
import { pauseEverything, resumeEverything } from '@/lib/autopilot/act';

export async function pauseEverythingAction(): Promise<ActionResult> {
  await requireLogin(); // before toResult, whose catch would swallow the redirect
  return toResult(async () => {
    const message = await pauseEverything();
    refresh();
    return message;
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
