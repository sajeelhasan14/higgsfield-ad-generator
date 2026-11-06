'use client';

// Money earned from ads against money spent on them, added up day by day, so the gap between the lines is the answer
// to "are the ads ahead?". Running totals, because a daily spend of £5 is invisible next to a single £800 order.
// Both lines are in pounds, so one axis fits. A client component because it follows the pointer and measures its width.
import { useState } from 'react';
import type { DayPoint } from '@/lib/analytics/repository';
import { COLOURS, dayLabel, moneyFormat, niceMax, TICKS, useWidth } from './chart-parts';

const SERIES = [
  { key: 'earned', label: 'Earned from ads', short: 'earned', color: COLOURS.ads },
  { key: 'spent', label: 'Spent on ads', short: 'spent', color: COLOURS.spend },
] as const;

const HEIGHT = 260;
const MARGIN = { top: 16, right: 64, bottom: 28, left: 56 };

function runningTotals(days: DayPoint[]) {
  let earned = 0;
  let spent = 0;
  return days.map((d) => {
    earned += d.revenue;
    spent += d.spend;
    return { day: d.day, earned, spent };
  });
}

export function RunningTotalChart({ days: daily, currency }: { days: DayPoint[]; currency: string }) {
  const { box, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const money = moneyFormat(currency);
  const days = runningTotals(daily);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const last = days.length - 1;
  const top = niceMax(Math.max(days[last].earned, days[last].spent));
  const x = (i: number) => MARGIN.left + (i / last) * plotWidth;
  const y = (value: number) => MARGIN.top + plotHeight - (value / top) * plotHeight;

  // The end labels are dropped when the two lines finish too close together to tell them apart.
  const endsApart = Math.abs(y(days[last].earned) - y(days[last].spent)) >= 16;
  const labelDays = [0, Math.floor(last / 2), last];

  function nearestDay(clientX: number, svg: SVGSVGElement) {
    const i = Math.round(((clientX - svg.getBoundingClientRect().left - MARGIN.left) / plotWidth) * last);
    setActive(Math.min(last, Math.max(0, i)));
  }

  function moveWithKeys(key: string) {
    if (key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? last) - 1));
    if (key === 'ArrowRight') setActive((i) => Math.min(last, (i ?? -1) + 1));
  }

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-5 text-xs text-muted">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} /> {s.label}
          </li>
        ))}
      </ul>

      <div ref={box} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Running totals of money earned from ads and money spent on ads. Use the left and right arrow keys to read each day; every value is also in the table below."
          tabIndex={0}
          className="block touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          onPointerMove={(e) => nearestDay(e.clientX, e.currentTarget)}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(e) => moveWithKeys(e.key)}
          onBlur={() => setActive(null)}
        >
          {Array.from({ length: TICKS + 1 }, (_, i) => (top / TICKS) * i).map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={COLOURS.grid} />
              <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {money(tick, tick % 1 === 0 ? 0 : 2)}
              </text>
            </g>
          ))}

          {labelDays.map((i, n) => (
            <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor={n === 0 ? 'start' : n === 2 ? 'end' : 'middle'} className="fill-muted text-[11px]">
              {dayLabel(days[i].day)}
            </text>
          ))}

          {active !== null && <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke={COLOURS.crosshair} />}

          {SERIES.map((s) => (
            <g key={s.key}>
              <polyline
                points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={x(active ?? last)} cy={y(days[active ?? last][s.key])} r={4} fill={s.color} stroke={COLOURS.surface} strokeWidth={2} />
              {endsApart && (
                <text x={x(last) + 9} y={y(days[last][s.key]) + 4} className="fill-ink text-[11px] font-medium tabular-nums">
                  {money(days[last][s.key], 0)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-2 w-44 rounded-lg border border-line bg-white p-2.5 text-xs shadow-sm"
            style={active > last / 2 ? { right: width - x(active) + 10 } : { left: x(active) + 10 }}
          >
            <p className="mb-1.5 text-muted">Up to {dayLabel(days[active].day)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: s.color }} />
                <span className="font-semibold tabular-nums">{money(days[active][s.key])}</span>
                <span className="truncate text-muted">{s.short}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-medium">Up to</th>
                <th className="py-1 text-right font-medium">Earned from ads</th>
                <th className="py-1 text-right font-medium">Spent on ads</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {days.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1">{dayLabel(d.day)}</td>
                  <td className="py-1 text-right">{money(d.earned)}</td>
                  <td className="py-1 text-right">{money(d.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
