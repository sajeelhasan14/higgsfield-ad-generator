// Which price an ad leads with. Shared by the post image and the caption, so the two can never disagree.
import type { ProductWithVariants, Variant } from '@/lib/products/types';

/** Ramps, edges and corners are sold as variants of a tile; they must not set the tile's "from" price. */
const ACCESSORY = /\b(ramp(ed)?|edges?|corners?)\b/i;

const isAccessory = (v: Variant) => ACCESSORY.test(v.title);

/** The cheapest variant that is the product itself; all variants count only if every one looks like an accessory. */
export function leadVariant(variants: Variant[]): Variant {
  const main = variants.filter((v) => !isAccessory(v));
  return (main.length ? main : variants).reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));
}

/** True when the main variants cost different amounts, so the lead price is a "from" price. */
export function hasFromPrice(variants: Variant[]): boolean {
  const main = variants.filter((v) => !isAccessory(v));
  return new Set((main.length ? main : variants).map((v) => v.price)).size > 1;
}

/** "per metre" when the store says the product is priced per metre, otherwise null. */
export function priceUnit(product: ProductWithVariants): string | null {
  return /\bper metre\b/i.test(product.title) ? 'per metre' : null;
}
