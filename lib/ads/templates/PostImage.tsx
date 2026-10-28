// The single post image: the product photo fills the frame, a dark fade keeps the text readable on any photo,
// and the name, the store's own facts, a strip of variant cards and the lead price sit at the bottom.
import { BRAND } from '@/lib/ads/brand';
import { BODY, DISPLAY, Headline, SLIDE_HEIGHT, SLIDE_WIDTH, Wordmark, headlineSize } from './shared';

const { text, muted, accent, chip } = BRAND.colors;

// Darkens the top for the wordmark and the lower half for the text; rgb(11,12,14) is BRAND.colors.background.
const FADE = 'linear-gradient(180deg, rgba(11,12,14,0.55) 0%, rgba(11,12,14,0) 18%, rgba(11,12,14,0) 30%, rgba(11,12,14,0.9) 60%, #0B0C0E 100%)';

const CARD_WIDTH = 200;
const CARD_PHOTO_HEIGHT = 130;

export interface CardProps {
  label: string; // e.g. "Black with Red Fleck"
  price: string; // e.g. "£39"
  fromPrice: boolean;
  photo: string | null; // data URI of the variant's own photo
}

export interface PostImageProps {
  image: string; // data URI
  eyebrow: string; // small line above the name, e.g. "Interlocking Rubber Gym Mats"
  headline: string;
  facts: string[]; // up to two short facts from the title, e.g. "200kg Drop Rated"
  cards: CardProps[]; // 0–4 variant cards
  price: string; // the lead price, e.g. "£45"
  fromPrice: boolean; // true when the product's variants cost different amounts
  unit: string | null; // e.g. "per metre"
  swipe: number | null; // on an Instagram carousel cover: how many option slides follow (the cards are left out then)
  wasPrice: string | null; // the old price when the lead variant is on sale
}

export function PostImage({ image, eyebrow, headline, facts, cards, price, fromPrice, unit, wasPrice, swipe }: PostImageProps) {
  // With a row of cards the headline gets less room, so very large type is capped.
  const nameSize = cards.length ? Math.min(headlineSize(headline), 96) : headlineSize(headline);
  return (
    <div style={{ display: 'flex', width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative', background: BRAND.colors.background }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image */}
      <img src={image} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} alt="" />
      <div style={{ position: 'absolute', top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, backgroundImage: FADE }} />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          boxSizing: 'border-box', // padding inside the frame, not added to it
          padding: 72,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Wordmark />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: 5, color: accent }}>{eyebrow.toUpperCase()}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: nameSize, lineHeight: 0.92, color: text, marginTop: 12, textWrap: 'balance' }}>
            <Headline text={headline} />
          </div>

          {facts.length > 0 && (
            <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
              {facts.map((fact) => (
                <div key={fact} style={{ display: 'flex', padding: '8px 22px', borderRadius: 999, background: chip }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: 1, color: accent }}>{fact.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}

          {cards.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
              {cards.map((c) => (
                <div
                  key={c.label}
                  style={{ display: 'flex', flexDirection: 'column', width: CARD_WIDTH, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}
                >
                  {c.photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>, not next/image
                    <img src={c.photo} width={CARD_WIDTH} height={CARD_PHOTO_HEIGHT} style={{ objectFit: 'cover' }} alt="" />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 14px' }}>
                    {/* At most three lines; a longer name is cut off rather than pushing the price down. */}
                    <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 22, lineHeight: 1.2, maxHeight: 80, overflow: 'hidden', color: muted }}>{c.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                      {c.fromPrice && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 20, color: muted }}>from</div>}
                      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 38, color: text }}>{c.price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 36 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                {fromPrice && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 38, color: muted }}>From</div>}
                <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 110, lineHeight: 1, color: text }}>{price}</div>
              </div>
              {(unit || wasPrice) && (
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {unit && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: muted }}>{unit}</div>}
                  {wasPrice && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: muted, textDecoration: 'line-through' }}>{`was ${wasPrice}`}</div>}
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: BODY,
                fontWeight: 600,
                fontSize: 28,
                color: text,
                padding: '16px 28px',
                borderRadius: 999,
                border: '2px solid rgba(255,255,255,0.35)',
                marginBottom: 10,
              }}
            >
              {swipe ? `Swipe for all ${swipe} options »` : `Shop at ${BRAND.website} »`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
