// Decides what goes on each slide of a product's carousel, then renders them all to JPEGs.
import type { ReactElement } from 'react';
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants, Variant } from '@/lib/products/types';
import { renderSlide } from './render';
import { CtaSlide } from './templates/CtaSlide';
import { HeroSlide } from './templates/HeroSlide';
import { VariantSlide } from './templates/VariantSlide';

/** Instagram allows 10 images per carousel: hero + 8 variants + the closing slide. */
export const MAX_VARIANT_SLIDES = 8;

export interface CarouselImages {
  hero: string; // data URI for slide 1
  variants: Record<string, string>; // variant id → data URI
}

/** "GFS Connect Tile – 20 mm Interlocking Rubber Gym Tile" → "GFS Connect Tile". Short names read better on a slide. */
export function shortName(title: string): string {
  return title.split(/\s[–—-]\s/)[0].trim();
}

/** Shopify gives single-variant products one option called "Title" with the value "Default Title"; that's not worth showing. */
function chipsFor(variant: Variant): string[] {
  return variant.options.filter((o) => o.value !== 'Default Title').map((o) => o.value);
}

function savePercent(price: string, wasPrice: string | null): number | null {
  if (!wasPrice || Number(wasPrice) <= Number(price)) return null;
  return Math.round((1 - Number(price) / Number(wasPrice)) * 100);
}

/** The carousel's slides as JSX, in order. Pure: the same product always gives the same slides. */
export function buildCarousel(product: ProductWithVariants, images: CarouselImages): ReactElement[] {
  const variants = product.variants.slice(0, MAX_VARIANT_SLIDES);
  if (variants.length === 0) throw new Error(`"${product.title}" has no variants to show`);

  const cheapest = variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));
  const name = shortName(product.title);

  const hero = (
    <HeroSlide
      image={images.hero}
      eyebrow={product.productType || 'Gym flooring'}
      headline={name}
      fromPrice={formatPrice(cheapest.price, cheapest.currency)}
      optionCount={variants.length}
    />
  );

  const variantSlides = variants.map((v) => {
    const sale = savePercent(v.price, v.compareAtPrice);
    return (
      <VariantSlide
        key={v.id}
        image={images.variants[v.id] ?? images.hero}
        productName={name}
        chips={chipsFor(v)}
        price={formatPrice(v.price, v.currency)}
        wasPrice={sale !== null && v.compareAtPrice ? formatPrice(v.compareAtPrice, v.currency) : null}
        savePercent={sale}
      />
    );
  });

  return [hero, ...variantSlides, <CtaSlide key="cta" />];
}

/** Every slide of the carousel as JPEG bytes, in order. */
export async function renderCarousel(product: ProductWithVariants, images: CarouselImages): Promise<Buffer[]> {
  const slides = buildCarousel(product, images);
  return Promise.all(slides.map((slide) => renderSlide(slide)));
}
