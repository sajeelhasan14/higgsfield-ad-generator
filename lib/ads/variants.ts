// Decides the variant cards under the headline: one card per variant for 2–4 variants, otherwise one card per
// value of an option with 2–4 values (a roll's colours), priced "from" the cheapest variant with that value.
import type { Variant } from '@/lib/products/types';

/** A row only fits this many readable cards on a phone. */
const MAX_CARDS = 4;

export interface VariantCard {
  label: string; // e.g. "Black with Red Fleck"
  chips: string[]; // the option values that tell this card apart, e.g. ["Ramp Edge Straight 1m", "Black (Straight)"]
  price: string; // the cheapest price in the card, e.g. "39.00"
  currency: string;
  fromPrice: boolean; // true when the variants in the card cost different amounts
  imageUrl: string | null; // the variant's own photo, if Shopify has one
}

/** Shopify gives single-variant products one option called "Title" with the value "Default Title". */
const realOptions = (v: Variant) => v.options.filter((o) => o.value !== 'Default Title');

/**
 * This store often repeats the same words in every variant name ("Gym Mats 36 inch x 36 inch x 17mm Black"),
 * so the words all names share are removed from the start and end, leaving only what differs.
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

function card(label: string, chips: string[], group: Variant[]): VariantCard {
  const cheapest = group.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));
  return {
    label,
    chips,
    price: cheapest.price,
    currency: cheapest.currency,
    fromPrice: new Set(group.map((v) => v.price)).size > 1,
    imageUrl: group.find((v) => v.imageUrl)?.imageUrl ?? null,
  };
}

/** The cards to show, or none when the variants can't be summed up in 2–4 cards (the caption lists them all). */
export function variantCards(variants: Variant[]): VariantCard[] {
  if (variants.length < 2) return [];

  if (variants.length <= MAX_CARDS) {
    const labels = differingParts(variants.map((v) => realOptions(v).map((o) => o.value).join(' · ') || v.title));
    // Options whose value is the same on every variant ("Size: 1m x 1m") don't tell the cards apart.
    const differs = (name: string) => new Set(variants.map((v) => v.options.find((o) => o.name === name)?.value)).size > 1;
    return variants.map((v, i) => {
      const chips = realOptions(v).filter((o) => differs(o.name)).map((o) => o.value);
      return card(labels[i], chips.length ? chips : [labels[i]], [v]);
    });
  }

  // Group by an option with 2–4 values, preferring one whose groups each have a photo (colours usually do).
  const groupings = [...new Set(variants.flatMap((v) => realOptions(v).map((o) => o.name)))]
    .map((name) => {
      const groups = new Map<string, Variant[]>();
      for (const v of variants) {
        const value = v.options.find((o) => o.name === name)?.value;
        if (value) groups.set(value, [...(groups.get(value) ?? []), v]);
      }
      return [...groups].map(([value, group]) => card(value, [value], group));
    })
    .filter((cards) => cards.length >= 2 && cards.length <= MAX_CARDS);
  return groupings.find((cards) => cards.every((c) => c.imageUrl)) ?? groupings[0] ?? [];
}
