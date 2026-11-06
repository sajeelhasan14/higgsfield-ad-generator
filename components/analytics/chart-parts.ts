// What the two hand-drawn charts share: the colours, the axis maths and measuring their own width.
import { useEffect, useRef, useState } from 'react';

// Checked with the colour validator on the card background. Each colour always means the same thing on the page.
export const COLOURS = { ads: '#2a3bd6', spend: '#c2570c', restOfStore: '#0d9488', grid: '#e6e2d9', crosshair: '#6e6a60', surface: '#fbfaf7' };

export const TICKS = 4;

/** The top of the axis: the next round number above the highest value, so the ticks read 0, 250, 500… */
export function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(value / TICKS));
  const nice = [1, 2, 2.5, 5, 10].find((n) => n * step * TICKS >= value) ?? 10;
  return nice * step * TICKS;
}

/** "2026-11-06" → "6 Nov". */
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}

export function moneyFormat(currency: string) {
  return (amount: number, digits = 2) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(amount);
}

/** A ref to put on the chart's box, and that box's width, kept up to date when the window changes size. */
export function useWidth() {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  return { box, width };
}
