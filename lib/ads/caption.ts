// The post's caption, written from Shopify data so names and prices always match the image.
import { formatPrice } from '@/lib/format';
import type { ProductWithVariants } from '@/lib/products/types';
import { BRAND } from './brand';
import { hasFromPrice, leadVariant, priceUnit } from './pricing';
import { excerpt, shortName } from './text';

const MAX_LISTED_VARIANTS = 8;

/** "Metal Planters" → "#metalplanters", so each post also reaches people following that kind of product. */
function productTypeTag(productType: string): string | null {
  const tag = productType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return tag && tag.length <= 24 ? `#${tag}` : null;
}

export function buildCaption(product: ProductWithVariants): string {
  const { variants } = product;
  const lead = leadVariant(variants);
  const from = hasFromPrice(variants) ? 'from ' : '';
  const unit = priceUnit(product);

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
    `${shortName(product.title)} – ${from}${formatPrice(lead.price, lead.currency)}${unit ? ` ${unit}` : ''}`,
    ...(intro ? ['', intro] : []),
    ...optionList,
    '',
    `Shop at ${BRAND.website} (link in bio).`,
    '',
    hashtags.join(' '),
  ].join('\n');
}
