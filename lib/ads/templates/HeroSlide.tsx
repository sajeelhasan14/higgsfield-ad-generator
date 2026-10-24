// Slide 1: the hook. Full-bleed image, short headline, starting price, and a nudge to swipe.
import { BRAND } from '@/lib/ads/brand';
import { BODY, DISPLAY, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark, headlineSize } from './shared';

export interface HeroSlideProps {
  image: string; // data URI
  eyebrow: string; // small line above the headline, e.g. "Rubber gym flooring"
  headline: string;
  fromPrice: string; // already formatted, e.g. "£22.50"
  optionCount: number;
}

export function HeroSlide({ image, eyebrow, headline, fromPrice, optionCount }: HeroSlideProps) {
  return (
    <div style={{ display: 'flex', width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative', background: BRAND.colors.background }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
      <img src={image} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: 'absolute', inset: 0, objectFit: 'cover' }} alt="" />
      {/* Darkens the lower half so white text stays readable on any photo. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(180deg, rgba(11,12,14,0.55) 0%, rgba(11,12,14,0) 22%, rgba(11,12,14,0) 42%, rgba(11,12,14,0.92) 74%, #0B0C0E 100%)',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, padding: 72, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Wordmark />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: 5, color: BRAND.colors.accent }}>
            {eyebrow.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: headlineSize(headline),
              lineHeight: 0.92,
              color: BRAND.colors.text,
              marginTop: 12,
              textWrap: 'balance',
            }}
          >
            {headline.toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 44 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 38, color: BRAND.colors.muted }}>From</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 110, lineHeight: 1, color: BRAND.colors.text }}>{fromPrice}</div>
            </div>
            {optionCount > 1 && (
              <div
                style={{
                  fontFamily: BODY,
                  fontWeight: 600,
                  fontSize: 30,
                  color: BRAND.colors.text,
                  padding: '16px 28px',
                  borderRadius: 999,
                  border: `2px solid rgba(255,255,255,0.35)`,
                  marginBottom: 10,
                }}
              >
                {`Swipe for all ${optionCount} options »`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
