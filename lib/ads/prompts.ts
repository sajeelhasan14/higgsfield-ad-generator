// What we ask the AI to do with the product's real Shopify photo. Everything product-specific comes from
// the product itself (title, type, description), so a gate gets a gate's setting and a planter a planter's.
// Names and prices are drawn by our template, never by the AI: image models misspell words and invent numbers.
import type { Product } from '@/lib/products/types';
import { BRAND } from './brand';
import { excerpt } from './text';

export function heroPrompt(product: Product): string {
  const description = excerpt(product.description, 500);
  return [
    `Create an advertising photograph for ${BRAND.name}, ${BRAND.about}.`,
    `The product in the reference photo is: ${product.title}${product.productType ? ` (${product.productType})` : ''}.`,
    description && `Product description: ${description}`,
    'Keep the product exactly as it appears in the reference photo: same shape, proportions, colour, material, finish and every detail. Do not add, remove or redesign any part of it.',
    "Place it in a fresh, realistic setting where a customer would really use this product, chosen to suit its description and different from the reference photo's background.",
    'Natural daylight, premium editorial lifestyle photography, the product sharp, centred and clearly the hero of the image.',
    'No people, no text, no letters, no numbers, no logos, no watermark.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Things the model should avoid, sent separately from the prompt. */
export const HERO_NEGATIVE_PROMPT =
  'changed product shape, different colour or finish, extra or missing parts, distorted proportions, text, letters, logo, watermark, people';
