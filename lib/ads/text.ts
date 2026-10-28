// Small text helpers shared by the post image, the caption and the AI prompt.

/** "17mm Interlocking Rubber Gym Mats | 3ft x 3ft | 200kg Drop Rated" → "17mm Interlocking Rubber Gym Mats". */
export function shortName(title: string): string {
  return title.split(/\s[–—|-]\s/)[0].trim();
}

/**
 * Up to two short facts from the rest of the title, word for word ("200kg Drop Rated", "Up to 65dB").
 * Only parts with a number in them, and not sizes ("3ft x 3ft"): the price list already shows those.
 */
export function titleFacts(title: string): string[] {
  return title
    .split(/\s\|\s/)
    .slice(1)
    .map((part) => part.trim())
    .filter((part) => part.length <= 24 && /\d/.test(part) && !/\d\s*[a-z]*\s*[x×]\s*\d/i.test(part))
    .slice(0, 2);
}

/** The start of a product description, cut at a sentence end (or a word, with "…") within maxChars. */
export function excerpt(text: string, maxChars: number): string {
  // Shopify's plain-text description joins headings to sentences ("an instant update.Construction &"), so restore the space.
  const clean = text.replace(/([.!?])(?=[A-Z])/g, '$1 ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > maxChars / 3) return cut.slice(0, sentenceEnd + 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
