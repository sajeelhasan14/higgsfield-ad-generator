// The post's caption, written from Shopify data so names and prices always match the image.
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants } from '@/lib/products/types';
import { BRAND } from './brand';
import { excerpt, shortName } from './text';

const MAX_LISTED_VARIANTS = 8;

/** "Metal Planters" → "#metalplanters", so each post also reaches people following that kind of product. */
function productTypeTag(productType: string): string | null {
  const tag = productType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return tag && tag.length <= 24 ? `#${tag}` : null;
}

export function buildCaption(product: ProductWithVariants): string {
  const { variants } = product;
  const cheapest = variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min), variants[0]);
  const from = new Set(variants.map((v) => v.price)).size > 1 ? 'from ' : '';

  const lines = variants.slice(0, MAX_LISTED_VARIANTS).map((v) => {
    const label = v.options.filter((o) => o.value !== 'Default Title').map((o) => o.value).join(' ') || v.title;
    const sale = v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) ? ` (was ${formatPrice(v.compareAtPrice, v.currency)})` : '';
    return `• ${label} – ${formatPrice(v.price, v.currency)}${sale}`;
  });
  if (variants.length > MAX_LISTED_VARIANTS) lines.push(`• …and ${variants.length - MAX_LISTED_VARIANTS} more options on the website`);
  // A single variant's price is already in the first line.
  const optionList = variants.length > 1 ? ['', ...lines] : [];

  const intro = excerpt(product.description, 220);
  const hashtags = [productTypeTag(product.productType), ...BRAND.hashtags].filter((t, i, all) => t && all.indexOf(t) === i);

  return [
    `${shortName(product.title)} – ${from}${formatPrice(cheapest.price, cheapest.currency)}`,
    ...(intro ? ['', intro] : []),
    ...optionList,
    '',
    `Shop at ${BRAND.website} (link in bio).`,
    '',
    hashtags.join(' '),
  ].join('\n');
}
