// Pieces used by the post template. Templates are drawn by Satori, which supports a subset of CSS:
// every element with more than one child needs display: 'flex', and only the fonts in render.ts exist.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BRAND } from '@/lib/ads/brand';

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350; // 4:5, the tallest shape Instagram shows in the feed

/** Font family names, matching the fonts loaded in render.ts. */
export const DISPLAY = 'Barlow Condensed';
export const BODY = 'Barlow';

// The store's logo (967×262, transparent background), read once. Templates only run on the server, never in a browser.
const LOGO_FILE = path.join(process.cwd(), 'assets', 'brand', 'logo.png');
let logo: string | null = null;
const logoDataUri = () => (logo ??= `data:image/png;base64,${readFileSync(LOGO_FILE).toString('base64')}`);

/** The store's logo, top left on every slide. */
export function Wordmark({ width = 400 }: { width?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image
  return <img src={logoDataUri()} width={width} height={Math.round((width * 262) / 967)} alt={BRAND.name} />;
}

/** "30mm Rubber Gym Tiles": a leading thickness is drawn in the accent colour, as on the store's own ads. */
export function Headline({ text }: { text: string }) {
  const [first, ...rest] = text.toUpperCase().split(' ');
  if (!/^\d+(\.\d+)?MM$/.test(first)) return <>{text.toUpperCase()}</>;
  return (
    <>
      <span style={{ color: BRAND.colors.accent }}>{first}</span>
      {` ${rest.join(' ')}`}
    </>
  );
}

/** Long names get smaller type, so a headline stays within about three lines. */
export function headlineSize(text: string): number {
  if (text.length > 44) return 84;
  if (text.length > 34) return 96;
  if (text.length > 20) return 124;
  return 150;
}
