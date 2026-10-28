// What we ask the AI to do with the product's real Shopify photo. Everything product-specific comes from
// the product itself (title, type, description), so a gate gets a gate's setting and a planter a planter's.
// Names and prices are drawn by our template, never by the AI: image models misspell words and invent numbers.
import type { Product } from '@/lib/products/types';
import { BRAND } from './brand';
import { excerpt } from './text';

/**
 * Places a product can be used. Only the ones the product's own description names are suggested, so the
 * setting always comes from the client's text; with none named, the AI chooses from the description.
 */
const PLACES = ['home gym', 'garage gym', 'garage', 'commercial gym', 'studio', 'CrossFit', 'upstairs', 'flat', 'basement', 'spare room', 'outbuilding', 'garden', 'workshop'];

/** Ways to photograph it; a regenerated picture uses the next one, so it looks new while the product stays the same. */
const SHOTS = [
  'eye-level three-quarter view, soft natural daylight from a window',
  'low camera angle, warm late-afternoon light',
  'high three-quarter view looking down, bright even daylight',
  'close shot with a softly blurred background, cool morning light',
];

function placesIn(description: string): string[] {
  const text = description.toLowerCase();
  return PLACES.filter((place) => text.includes(place.toLowerCase()));
}

/** `variation` picks the shot and the place; consecutive numbers give different combinations. */
export function heroPrompt(product: Product, variation = 0): string {
  const description = excerpt(product.description, 500);
  const places = placesIn(product.description);
  const place = places.length ? places[variation % places.length] : null;
  return [
    `Create an advertising photograph for ${BRAND.name}, ${BRAND.about}.`,
    `The product in the reference photo is: ${product.title}${product.productType ? ` (${product.productType})` : ''}.`,
    description && `Product description: ${description}`,
    'Keep the product exactly as it appears in the reference photo: same shape, proportions, colour, material, finish and every detail. Do not add, remove or redesign any part of it.',
    place
      ? `Place it in a fresh, realistic ${place} setting where a customer would really use this product, different from the reference photo's background.`
      : "Place it in a fresh, realistic setting where a customer would really use this product, chosen to suit its description and different from the reference photo's background.",
    `Camera and light: ${SHOTS[variation % SHOTS.length]}. Premium editorial lifestyle photography, the product sharp and clearly the hero of the image.`,
    'Show the product in the upper half of the frame and keep the lower half calm and uncluttered (mostly floor), because text is placed there.',
    'No people, no text, no letters, no numbers, no logos, no watermark.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Things the model should avoid, sent separately from the prompt. */
export const HERO_NEGATIVE_PROMPT =
  'changed product shape, different colour or finish, extra or missing parts, distorted proportions, text, letters, logo, watermark, people';
