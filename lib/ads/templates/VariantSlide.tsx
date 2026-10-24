// One slide per variant: big product photo, its options, and its price (with the saving, when on sale).
import { BRAND } from '@/lib/ads/brand';
import { BODY, DISPLAY, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark } from './shared';

export interface VariantSlideProps {
  image: string; // data URI
  productName: string;
  chips: string[]; // the variant's option values, e.g. ["20mm", "Black"]
  price: string; // formatted, e.g. "£45.00"
  wasPrice: string | null; // formatted compare-at price, when on sale
  savePercent: number | null;
}

const PADDING = 64;
const IMAGE_HEIGHT = 840;

export function VariantSlide({ image, productName, chips, price, wasPrice, savePercent }: VariantSlideProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        boxSizing: 'border-box', // padding inside the 1080×1350, not added to it
        padding: PADDING,
        background: BRAND.colors.background,
      }}
    >
      <Wordmark />

      <div style={{ display: 'flex', marginTop: 36, height: IMAGE_HEIGHT, borderRadius: 36, overflow: 'hidden', background: BRAND.colors.surface }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
        <img src={image} width={SLIDE_WIDTH - PADDING * 2} height={IMAGE_HEIGHT} style={{ objectFit: 'cover' }} alt="" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {chips.map((chip) => (
            <div
              key={chip}
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: 2,
                color: BRAND.colors.accent,
                background: 'rgba(47,123,255,0.14)',
                padding: '8px 22px',
                borderRadius: 999,
              }}
            >
              {chip.toUpperCase()}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 34, color: BRAND.colors.muted, marginTop: 18, lineClamp: 1 }}>
          {productName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 4 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, lineHeight: 1, color: BRAND.colors.text }}>{price}</div>
          {wasPrice && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 40, color: BRAND.colors.muted, textDecoration: 'line-through' }}>
                {wasPrice}
              </div>
              {savePercent !== null && (
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    fontSize: 30,
                    letterSpacing: 2,
                    color: BRAND.colors.text,
                    background: BRAND.colors.accent,
                    padding: '6px 16px',
                    borderRadius: 8,
                  }}
                >
                  {`SAVE ${savePercent}%`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
