// The single post image: the product photo on top, a forest-green panel with the name, the variants and their
// prices below, and a terracotta price badge where the two meet, like a label on a seed packet.
import { BRAND } from '@/lib/ads/brand';
import { BODY, SERIF, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark, headlineLines, headlineSize } from './shared';

const { forest, cream, sage, terracotta } = BRAND.colors;

const MIN_PANEL_HEIGHT = 500;
const PANEL_PADDING_X = 64;
const BADGE = 250; // badge diameter
const ROW_HEIGHT = 46;

export interface PriceRow {
  label: string; // e.g. "Stand Alone"
  price: string; // e.g. "£2,150"
  wasPrice: string | null;
}

export interface PostImageProps {
  image: string; // data URI
  eyebrow: string; // small line above the name, e.g. "Metal Planters"
  headline: string;
  prices: PriceRow[]; // filled only for products with 2–4 variants
  options: string[]; // the short summary used instead when there are 5 or more variants
  price: string; // the cheapest price, e.g. "£22.50"
  fromPrice: boolean; // true when variants cost different amounts
  wasPrice: string | null; // the old price when the cheapest variant is on sale
}

export function PostImage({ image, eyebrow, headline, prices, options, price, fromPrice, wasPrice }: PostImageProps) {
  const nameSize = prices.length >= 3 ? Math.min(headlineSize(headline), 74) : headlineSize(headline);
  // The panel grows upwards to fit its text, so a price list never runs off the bottom.
  const textWidth = SLIDE_WIDTH - PANEL_PADDING_X * 2;
  const contentHeight =
    60 + 30 + 14 + // top padding, category, gap
    headlineLines(headline, nameSize, textWidth) * nameSize * 1.04 +
    (prices.length ? 22 + prices.length * ROW_HEIGHT : options.length ? 18 + options.length * 36 : 0) +
    40 + 34 + 52; // gap, website, bottom padding
  const panelHeight = Math.max(MIN_PANEL_HEIGHT, Math.ceil(contentHeight));
  const panelTop = SLIDE_HEIGHT - panelHeight;

  return (
    <div style={{ display: 'flex', width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative', background: forest }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
      <img src={image} width={SLIDE_WIDTH} height={panelTop + 50} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} alt="" />

      <div style={{ position: 'absolute', top: 48, left: 48, display: 'flex' }}>
        <Wordmark />
      </div>

      <div
        style={{
          position: 'absolute',
          top: panelTop,
          left: 0,
          width: SLIDE_WIDTH,
          height: panelHeight,
          boxSizing: 'border-box', // padding inside the panel, not added to it
          padding: `60px ${PANEL_PADDING_X}px 52px`,
          display: 'flex',
          flexDirection: 'column',
          background: forest,
          borderTopLeftRadius: 56,
          borderTopRightRadius: 56,
        }}
      >
        <div style={{ maxWidth: 620, fontFamily: BODY, fontWeight: 600, fontSize: 26, letterSpacing: 4, color: sage }}>{eyebrow.toUpperCase()}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: nameSize, lineHeight: 1.04, color: cream, marginTop: 14, textWrap: 'balance' }}>
          {headline}
        </div>

        {prices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22 }}>
            {prices.map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-end', height: ROW_HEIGHT }}>
                {/* A long variant name is shortened with "…"; its price always shows in full. */}
                <div style={{ maxWidth: 640, fontFamily: BODY, fontWeight: 500, fontSize: 30, color: cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.label}
                </div>
                {/* Dotted line between the name and the price, like a menu. */}
                <div style={{ flexGrow: 1, margin: '0 16px 9px', borderBottom: '3px dotted rgba(244,239,227,0.3)' }} />
                {row.wasPrice && (
                  <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 24, color: sage, textDecoration: 'line-through', marginRight: 12, marginBottom: 3 }}>
                    {row.wasPrice}
                  </div>
                )}
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, color: cream, flexShrink: 0 }}>{row.price}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 18 }}>
            {options.map((line) => (
              <div key={line} style={{ fontFamily: BODY, fontWeight: 500, fontSize: 28, color: cream, opacity: 0.85 }}>
                {line}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', fontFamily: BODY, fontWeight: 600, fontSize: 28, letterSpacing: 1, color: sage }}>{`Shop at ${BRAND.website}`}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: panelTop - BADGE / 2 - 20,
          right: 64,
          width: BADGE,
          height: BADGE,
          borderRadius: 999,
          background: terracotta,
          border: `6px solid ${cream}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {fromPrice && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, letterSpacing: 3, color: cream }}>FROM</div>}
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: price.length > 7 ? 46 : 58, lineHeight: 1.05, color: cream }}>{price}</div>
        {wasPrice && (
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 24, color: cream, opacity: 0.85, textDecoration: 'line-through' }}>{wasPrice}</div>
        )}
      </div>
    </div>
  );
}
