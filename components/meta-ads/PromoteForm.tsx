'use client';

// Daily budget + days for one ad, with the most it can spend shown before anything is sent.
import { useActionState, useState } from 'react';
import { promoteAction } from '@/app/(dashboard)/meta-ads/actions';

interface Props {
  adId: string;
  limits: { minDaily: number; maxDaily: number; minDays: number; maxDays: number };
}

export function PromoteForm({ adId, limits }: Props) {
  const [result, action, pending] = useActionState(promoteAction, null);
  const [budget, setBudget] = useState(5);
  const [days, setDays] = useState(7);
  const maxSpend = (budget * days).toFixed(2);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Create a paid ad on Meta: £${budget}/day for ${days} days (at most £${maxSpend})? It is created switched off.`)) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="adId" value={adId} />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-[0.14em] text-muted">
          £ PER DAY
          <input
            type="number"
            name="dailyBudget"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min={limits.minDaily}
            max={limits.maxDaily}
            step={0.5}
            required
            className="h-10 w-28 rounded-xl border border-line bg-white px-3 text-sm font-normal tracking-normal text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-[0.14em] text-muted">
          DAYS
          <input
            type="number"
            name="days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            min={limits.minDays}
            max={limits.maxDays}
            step={1}
            required
            className="h-10 w-24 rounded-xl border border-line bg-white px-3 text-sm font-normal tracking-normal text-ink outline-none focus:border-brand"
          />
        </label>
      </div>
      <p className="text-xs text-muted">At most £{maxSpend} in total · UK, adults · Facebook + Instagram</p>
      <div className="flex flex-col items-start gap-1">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {pending ? 'Creating on Meta…' : 'Promote'}
        </button>
        {result && <span className={`text-xs ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</span>}
      </div>
    </form>
  );
}
