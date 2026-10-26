'use client';

import { useActionState } from 'react';
import { addSlotAction } from '@/app/(dashboard)/schedule/actions';

export function AddSlotForm() {
  const [result, action, pending] = useActionState(addSlotAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="time" name="time" required className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand" />
      <button type="submit" disabled={pending} className="h-10 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {pending ? 'Adding…' : 'Add time'}
      </button>
      {result && <span className={`w-full text-xs ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</span>}
    </form>
  );
}
