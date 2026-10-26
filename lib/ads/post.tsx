// Decides what goes on a product's post image, then renders it to a JPEG.
// One image per product: no product has its own photo per variant, so a carousel would repeat the same picture.
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants, Variant } from '@/lib/products/types';
import { renderSlide } from './render';
import { PostImage, type PriceRow } from './templates/PostImage';
import { shortName } from './text';

/** Up to this many variants are listed one by one with their prices; more get the short summary. */
const MAX_PRICE_ROWS = 4;

/** "£2,150" fits the image better than "£2,150.00"; pence stay when there are any. */
function shortPrice(amount: string, currency: string): string {
  return formatPrice(amount, currency).replace(/\.00$/, '');
}

const isOnSale = (v: Variant) => v.compareAtPrice !== null && Number(v.compareAtPrice) > Number(v.price);

/** Shopify gives single-variant products one option called "Title" with the value "Default Title". */
const realOptions = (v: Variant) => v.options.filter((o) => o.value !== 'Default Title');

/** "Length: 0.6m · 1.2m · 1.8m" for each option that differs between variants (at most two lines). */
function optionLines(variants: Variant[]): string[] {
  const values = new Map<string, string[]>();
  for (const v of variants) {
    for (const o of realOptions(v)) {
      const list = values.get(o.name) ?? [];
      if (!list.includes(o.value)) values.set(o.name, [...list, o.value]);
    }
  }
  return [...values]
    .filter(([, list]) => list.length > 1)
    .slice(0, 2)
    .map(([name, list]) => {
      const joined = `${name}: ${list.join(' · ')}`;
      return joined.length <= 52 ? joined : `${list.length} ${name.toLowerCase()} options`;
    });
}

/**
 * This store writes the whole description into each variant's name ("'X' Brace Gate - Stand Alone (1.04m H, …)"),
 * so the words every name shares are removed from the start and end, leaving only what differs ("Stand Alone").
 */
function differingParts(labels: string[]): string[] {
  const words = labels.map((l) => l.split(' '));
  const shortest = Math.min(...words.map((w) => w.length));
  let start = 0;
  while (start < shortest - 1 && words.every((w) => w[start] === words[0][start])) start++;
  let end = 0;
  while (end < shortest - start - 1 && words.every((w) => w[w.length - 1 - end] === words[0][words[0].length - 1 - end])) end++;
  const trimmed = words.map((w) => w.slice(start, w.length - end).join(' ').replace(/^[\s\-–—,:·]+|[\s\-–—,:·(]+$/g, ''));
  return trimmed.every(Boolean) ? trimmed : labels;
}

/** One row per variant ("Stand Alone … £2,150"), only for products with 2–4 variants. */
function priceRows(variants: Variant[]): PriceRow[] {
  if (variants.length < 2 || variants.length > MAX_PRICE_ROWS) return [];
  const labels = differingParts(variants.map((v) => realOptions(v).map((o) => o.value).join(' · ') || v.title));
  return variants.map((v, i) => ({
    label: labels[i],
    price: shortPrice(v.price, v.currency),
    wasPrice: isOnSale(v) ? shortPrice(v.compareAtPrice!, v.currency) : null,
  }));
}

/** The post as JSX. Pure: the same product and picture always give the same image. */
export function buildPost(product: ProductWithVariants, image: string) {
  const { variants } = product;
  if (variants.length === 0) throw new Error(`"${product.title}" has no variants to show`);

  const cheapest = variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));

  return (
    <PostImage
      image={image}
      eyebrow={product.productType || 'Garden'}
      headline={shortName(product.title)}
      prices={priceRows(variants)}
      options={optionLines(variants)}
      price={shortPrice(cheapest.price, cheapest.currency)}
      fromPrice={new Set(variants.map((v) => v.price)).size > 1}
      wasPrice={isOnSale(cheapest) ? shortPrice(cheapest.compareAtPrice!, cheapest.currency) : null}
    />
  );
}

export async function renderPost(product: ProductWithVariants, image: string): Promise<Buffer> {
  return renderSlide(buildPost(product, image));
}
