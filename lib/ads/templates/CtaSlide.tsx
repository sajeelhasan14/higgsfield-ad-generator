// Last slide: why buy from us, and where. Links in Instagram captions aren't clickable, hence "link in bio".
import { BRAND } from '@/lib/ads/brand';
import { BODY, DISPLAY, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark } from './shared';

export function CtaSlide() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        boxSizing: 'border-box', // padding inside the 1080×1350, not added to it
        padding: 88,
        backgroundImage: `linear-gradient(160deg, ${BRAND.colors.background} 0%, ${BRAND.colors.background} 50%, rgba(47,123,255,0.42) 100%)`,
        backgroundColor: BRAND.colors.background,
      }}
    >
      <Wordmark />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, lineHeight: 0.92, color: BRAND.colors.text, textWrap: 'balance' }}>
          {BRAND.tagline.toUpperCase()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 64 }}>
          {BRAND.perks.map((perk) => (
            <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, background: BRAND.colors.accent }} />
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 42, color: BRAND.colors.text }}>{perk}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 32, color: BRAND.colors.muted }}>Shop now at</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, lineHeight: 1.05, color: BRAND.colors.accent }}>{BRAND.website}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: BRAND.colors.muted, marginTop: 8 }}>Link in bio</div>
      </div>
    </div>
  );
}
