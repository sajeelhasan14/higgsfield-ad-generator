// Pieces used by more than one slide. Templates are drawn by Satori, which supports a subset of CSS:
// every element with more than one child needs display: 'flex', and only the fonts in render.ts exist.
import { BRAND } from '@/lib/ads/brand';

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5, the tallest shape Instagram shows in the feed

/** Font family names, matching the fonts loaded in render.ts. */
export const DISPLAY = 'Barlow Condensed';
export const BODY = 'Barlow';

export function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 10, height: 34, background: BRAND.colors.accent }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: BRAND.colors.text }}>
        {BRAND.name.toUpperCase()}
      </div>
    </div>
  );
}

/** Long names get smaller type, so a headline never runs off the slide. */
export function headlineSize(text: string): number {
  if (text.length > 34) return 96;
  if (text.length > 20) return 124;
  return 150;
}
