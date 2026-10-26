'use server';

import { redirect } from 'next/navigation';
import type { ActionResult } from '@/lib/action-result';
import { checkPassword, endSession, startSession } from '@/lib/auth';

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let ok: boolean;
  try {
    ok = checkPassword(String(formData.get('password') ?? ''));
    if (ok) await startSession();
  } catch (err) {
    // Missing ADMIN_PASSWORD / SESSION_SECRET: the details go to the server log, not to a visitor.
    console.error('Login failed:', err);
    return { ok: false, message: 'Login is not set up on the server.' };
  }
  if (!ok) {
    // Wait a second before answering, so trying many passwords takes a very long time.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { ok: false, message: 'Wrong password' };
  }
  // Outside the try: redirect() works by throwing, and the catch above would swallow it.
  redirect('/products');
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/login');
}
