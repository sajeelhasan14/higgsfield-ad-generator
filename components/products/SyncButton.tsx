'use client';

import { useActionState } from 'react';
import { syncProductsAction } from '@/app/products/actions';

export function SyncButton() {
  // pending: true while the sync runs, so the button can show progress and not be pressed twice.
  const [state, action, pending] = useActionState(syncProductsAction, null);

  return (
    <form action={action} className="flex items-center gap-3">
      {state && (
        <p className={`text-sm ${state.ok ? 'text-emerald-600' : 'text-red-600'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {pending ? 'Syncing…' : 'Sync from Shopify'}
      </button>
    </form>
  );
}
