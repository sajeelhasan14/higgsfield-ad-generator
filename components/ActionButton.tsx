'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/lib/action-result';

const TONES = {
  primary: 'bg-brand text-white shadow-[0_8px_20px_-8px_rgba(42,59,214,0.7)] hover:bg-brand-dark',
  secondary: 'border border-line bg-white text-ink hover:bg-stone-50',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};

interface Props {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Hidden form fields sent with the click, e.g. { adId: '12' }. */
  fields: Record<string, string>;
  label: string;
  tone?: keyof typeof TONES;
  /** When set, asks "are you sure?" first (for deleting, or anything that costs money). */
  confirm?: string;
}

/** A button that runs a server action, shows "…" while it runs, then shows the result message. */
export function ActionButton({ action, fields, label, tone = 'secondary', confirm }: Props) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="flex flex-col items-start gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${TONES[tone]}`}>
        {pending ? `${label}…` : label}
      </button>
      {result && <span className={`text-xs ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</span>}
    </form>
  );
}
