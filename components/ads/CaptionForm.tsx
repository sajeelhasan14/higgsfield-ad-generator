'use client';

import { useActionState } from 'react';
import { saveCaptionAction } from '@/app/(dashboard)/review/actions';

export function CaptionForm({ adId, caption }: { adId: string; caption: string }) {
  const [result, action, pending] = useActionState(saveCaptionAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="adId" value={adId} />
      <label className="text-[11px] font-semibold tracking-[0.14em] text-muted">CAPTION</label>
      <textarea
        name="caption"
        defaultValue={caption}
        rows={7}
        maxLength={2200}
        className="w-full rounded-xl border border-line bg-white p-3 text-sm leading-relaxed outline-none focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium hover:bg-stone-50 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save caption'}
        </button>
        {result && <span className={`text-xs ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</span>}
      </div>
    </form>
  );
}
