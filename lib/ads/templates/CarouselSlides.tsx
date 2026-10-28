// The slides after the cover in an Instagram carousel, in the same style: one per variant card, then a shop slide.
// The shop slide only names the website: the store's own promises have to come from the client.
import { BRAND } from '@/lib/ads/brand';
import { BODY, DISPLAY, Headline, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark } from './shared';

const { background, text, muted, accent, chip } = BRAND.colors;
const PADDING = 64;
const FRAME_WIDTH = SLIDE_WIDTH - PADDING * 2;
export const FRAME_HEIGHT = 740;

export interface VariantSlideProps {
  photo: string; // data URI of the variant's own photo
  backdrop: string; // data URI of a blurred copy of it that fills the frame (see images.ts)
  chips: string[]; // the variant's option values, e.g. ["Black with Red Fleck"]
  productName: string; // e.g. "Rubber Crumb Gym Flooring Roll 10m x 1m"
  price: string; // e.g. "£199"
  fromPrice: boolean;
  unit: string | null; // e.g. "per metre"
}

export function VariantSlide({ photo, backdrop, chips, productName, price, fromPrice, unit }: VariantSlideProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: SLIDE_WIDTH, height: SLIDE_HEIGHT, padding: PADDING, boxSizing: 'border-box', background }}>
      <Wordmark width={300} />
      {/* The photo is shown whole (never cropped) over a blurred copy of itself, so any photo shape fills the frame. */}
      <div style={{ display: 'flex', position: 'relative', marginTop: 32, width: FRAME_WIDTH, height: FRAME_HEIGHT, borderRadius: 28, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
        <img src={backdrop} width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
        <img src={photo} width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'contain' }} alt="" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 36 }}>
        {chips.map((c) => (
          <div key={c} style={{ display: 'flex', padding: '8px 22px', borderRadius: 999, background: chip }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: 1, color: accent }}>{c.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: muted, marginTop: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {productName}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 'auto' }}>
        {fromPrice && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 38, color: muted }}>From</div>}
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 120, lineHeight: 1, color: text }}>{price}</div>
        {unit && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 32, color: muted }}>{unit}</div>}
      </div>
    </div>
  );
}

/** The last slide: where to buy. */
export function ShopSlide({ headline }: { headline: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        padding: 88,
        boxSizing: 'border-box',
        backgroundImage: 'linear-gradient(160deg, #0B0C0E 50%, #3B1A08 100%)', // black into a dark shade of the accent
      }}
    >
      <Wordmark />
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: headline.length > 30 ? 96 : 124, lineHeight: 0.95, color: text, textWrap: 'balance' }}>
        <Headline text={headline} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 34, color: muted }}>Shop now at</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, lineHeight: 1.05, color: accent }}>{BRAND.website}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: muted, marginTop: 14 }}>Link in bio</div>
      </div>
    </div>
  );
}
