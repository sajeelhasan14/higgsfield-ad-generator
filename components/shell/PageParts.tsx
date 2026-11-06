// Building blocks every dashboard page uses: the big title, section headings and the row of stat cards.
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {title}
          <span className="text-brand">.</span>
        </h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

const DOTS = { neutral: 'bg-stone-400', green: 'bg-teal-600', amber: 'bg-amber-600', red: 'bg-red-600', blue: 'bg-brand' };
const NUMBERS = { neutral: 'text-ink', green: 'text-teal-700', amber: 'text-amber-700', red: 'text-red-600', blue: 'text-brand' };

export interface Stat {
  label: string;
  value: number | string;
  tone?: keyof typeof DOTS;
  note?: string; // a small line under the number, e.g. the change since last period
}

/** One card split into equal cells, like the stock overview in a store dashboard. */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    // The 1px gap shows the line colour behind the cells, which draws the dividers on any number of columns.
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface p-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted">
            <span className={`h-2 w-2 rounded-full ${DOTS[s.tone ?? 'neutral']}`} /> {s.label.toUpperCase()}
          </p>
          <p className={`mt-3 font-display text-2xl font-bold tabular-nums sm:text-3xl ${NUMBERS[s.tone ?? 'neutral']}`}>{typeof s.value === 'number' ? s.value.toLocaleString('en-GB') : s.value}</p>
          {s.note && <p className="mt-1 text-xs text-muted">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** A small heading above a group of cards. */
export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
      {children}
      {count !== undefined && <span className="rounded-full bg-black/5 px-2 py-0.5 font-sans text-xs font-medium text-muted">{count}</span>}
    </h2>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-10 text-center text-sm text-muted">{children}</p>;
}
