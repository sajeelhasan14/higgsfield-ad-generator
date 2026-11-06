'use client';

// Store sales per period as stacked columns: what came from our ads on the bottom, everything else on top.
// It shows what the ads add to the business. A client component because it follows the pointer and measures its width.
import { useState } from 'react';
import type { DayPoint } from '@/lib/analytics/repository';
import { COLOURS, dayLabel, moneyFormat, niceMax, TICKS, useWidth } from './chart-parts';

const HEIGHT = 240;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 24;
const GAP = 2; // the space between the two parts of a column

interface Bucket {
  from: string;
  to: string;
  ads: number;
  rest: number;
}

/** Days are grouped so the chart has a readable number of columns: days, then weeks, then 30-day blocks. */
function bucketSize(dayCount: number): number {
  if (dayCount <= 7) return 1;
  return dayCount <= 90 ? 7 : 30;
}

/** Counts back from today, so the newest column is always a full one. */
function toBuckets(days: DayPoint[]): Bucket[] {
  const size = bucketSize(days.length);
  const buckets: Bucket[] = [];
  for (let end = days.length; end > 0; end -= size) {
    const part = days.slice(Math.max(0, end - size), end);
    const ads = part.reduce((sum, d) => sum + d.revenue, 0);
    const store = part.reduce((sum, d) => sum + d.storeRevenue, 0);
    buckets.unshift({ from: part[0].day, to: part[part.length - 1].day, ads, rest: store - ads });
  }
  return buckets;
}

function periodLabel(b: Bucket): string {
  return b.from === b.to ? dayLabel(b.from) : `${dayLabel(b.from)} – ${dayLabel(b.to)}`;
}

/** A rectangle with rounded top corners and a square bottom, sitting on the baseline. */
function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function StoreSalesChart({ days, currency }: { days: DayPoint[]; currency: string }) {
  const { box, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const money = moneyFormat(currency);
  const buckets = toBuckets(days);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotHeight;
  const top = niceMax(Math.max(...buckets.map((b) => b.ads + b.rest)));
  const band = plotWidth / buckets.length;
  const barWidth = Math.min(MAX_BAR, band * 0.6);
  const left = (i: number) => MARGIN.left + band * i + (band - barWidth) / 2;
  const height = (value: number) => (value / top) * plotHeight;
  const y = (value: number) => baseline - height(value);
  const last = buckets.length - 1;
  const labelled = [...new Set([0, Math.floor(last / 2), last])];

  function moveWithKeys(key: string) {
    if (key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? last + 1) - 1));
    if (key === 'ArrowRight') setActive((i) => Math.min(last, (i ?? -1) + 1));
  }

  const legend = [
    { label: 'From our ads', color: COLOURS.ads },
    { label: 'Rest of the store', color: COLOURS.restOfStore },
  ];

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-5 text-xs text-muted">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}
          </li>
        ))}
      </ul>

      <div ref={box} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Store sales per period, split into sales from our ads and the rest of the store. Use the left and right arrow keys to read each column; every value is also in the table below."
          tabIndex={0}
          className="block touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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

          {labelled.map((i) => (
            <text
              key={i}
              x={i === 0 ? MARGIN.left : i === last ? width - MARGIN.right : left(i) + barWidth / 2}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
              className="fill-muted text-[11px]"
            >
              {dayLabel(buckets[i].to)}
            </text>
          ))}

          {buckets.map((b, i) => {
            const adsHeight = height(b.ads);
            const restHeight = height(b.rest);
            const gap = b.ads > 0 && b.rest > 0 ? GAP : 0;
            const faded = active !== null && active !== i;
            return (
              <g key={b.from} opacity={faded ? 0.45 : 1}>
                {b.ads > 0 &&
                  (b.rest > 0 ? (
                    <rect x={left(i)} y={baseline - adsHeight} width={barWidth} height={adsHeight} fill={COLOURS.ads} />
                  ) : (
                    <path d={roundedTop(left(i), baseline - adsHeight, barWidth, adsHeight)} fill={COLOURS.ads} />
                  ))}
                {b.rest > 0 && <path d={roundedTop(left(i), baseline - adsHeight - gap - restHeight, barWidth, restHeight)} fill={COLOURS.restOfStore} />}
                {/* The whole column's width and height is the hover target, not just the painted bar. */}
                <rect x={MARGIN.left + band * i} y={MARGIN.top} width={band} height={plotHeight} fill="transparent" onPointerEnter={() => setActive(i)} />
              </g>
            );
          })}
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-2 w-48 rounded-lg border border-line bg-white p-2.5 text-xs shadow-sm"
            style={active > last / 2 ? { right: width - left(active) + 10 } : { left: left(active) + barWidth + 10 }}
          >
            <p className="mb-1.5 text-muted">{periodLabel(buckets[active])}</p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: COLOURS.ads }} />
              <span className="font-semibold tabular-nums">{money(buckets[active].ads)}</span>
              <span className="truncate text-muted">from ads</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: COLOURS.restOfStore }} />
              <span className="font-semibold tabular-nums">{money(buckets[active].rest)}</span>
              <span className="truncate text-muted">rest of store</span>
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-medium">Period</th>
                <th className="py-1 text-right font-medium">From our ads</th>
                <th className="py-1 text-right font-medium">Rest of the store</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {buckets.map((b) => (
                <tr key={b.from} className="border-t border-line">
                  <td className="py-1">{periodLabel(b)}</td>
                  <td className="py-1 text-right">{money(b.ads)}</td>
                  <td className="py-1 text-right">{money(b.rest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
