'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/login/actions';

/** The password box. A client component so "Wrong password" can appear without reloading the page. */
export function LoginForm() {
  const [result, formAction, pending] = useActionState(loginAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        className="h-12 rounded-xl border border-line bg-white px-4 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-full bg-brand text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,59,214,0.6)] hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? 'Logging in…' : 'Log in'}
      </button>
      {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
    </form>
  );
}
