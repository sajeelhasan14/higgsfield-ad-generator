// Pieces used by the post template. Templates are drawn by Satori, which supports a subset of CSS:
// every element with more than one child needs display: 'flex', and only the fonts in render.ts exist.
import { BRAND } from '@/lib/ads/brand';

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5, the tallest shape Instagram shows in the feed

/** Font family names, matching the fonts loaded in render.ts. */
export const SERIF = 'Fraunces';
export const BODY = 'Barlow';

/** The store name on a cream pill, readable on any photo. */
export function Wordmark() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 26px',
        borderRadius: 999,
        background: BRAND.colors.cream,
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: 999, background: BRAND.colors.terracotta }} />
      <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 30, color: BRAND.colors.ink }}>{BRAND.name}</div>
    </div>
  );
}

/** Long names get smaller type, so a headline stays within about three lines. */
export function headlineSize(text: string): number {
  if (text.length > 48) return 62;
  if (text.length > 32) return 74;
  if (text.length > 18) return 88;
  return 104;
}

/** Roughly how many lines the headline takes, so the panel can grow to fit it. */
export function headlineLines(text: string, size: number, width: number): number {
  const charsPerLine = Math.floor(width / (size * 0.5));
  return Math.min(3, Math.ceil(text.length / charsPerLine));
}
