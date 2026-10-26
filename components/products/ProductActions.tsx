'use client';

import { useActionState } from 'react';
import { syncProductsAction } from '@/app/(dashboard)/products/actions';
import { Icon } from '@/components/shell/Icon';

export function SyncButton() {
  // pending: true while the sync runs, so the button can show progress and not be pressed twice.
  const [state, action, pending] = useActionState(syncProductsAction, null);

  return (
    <form action={action} className="flex items-center gap-3">
      {state && (
        <p className={`text-sm ${state.ok ? 'text-teal-700' : 'text-red-600'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,59,214,0.6)] transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Icon name="refresh" className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Syncing…' : 'Sync from Shopify'}
      </button>
    </form>
  );
}
