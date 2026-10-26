// Small text helpers shared by the post image, the caption and the AI prompt.

/** "Anthracite Grey Metal Trough Planter – 1mm Galvanised Steel…" → "Anthracite Grey Metal Trough Planter". */
export function shortName(title: string): string {
  return title.split(/\s[–—-]\s/)[0].trim();
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
