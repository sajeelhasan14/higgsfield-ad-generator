// What we ask the AI to draw. Every prompt says "no text": names and prices are drawn by our templates,
// because image models misspell words and invent numbers.

const NO_TEXT = 'no text, no letters, no numbers, no logos, no watermark, no people';

/** Slide 1's background: the flooring in a premium setting, with a calm dark lower half for the headline. */
export function heroPrompt(productType: string, look: string): string {
  return [
    `Premium home gym interior with ${productType.toLowerCase()} covering the whole floor: ${look}.`,
    'A loaded black barbell rests on the floor in the middle distance, squat rack softly out of focus behind.',
    'Moody low-key lighting, cool blue rim light, cinematic editorial photography, 35mm lens, shallow depth of field.',
    'The lower third of the image is dark, even floor with no objects, leaving clean space.',
    NO_TEXT,
  ].join(' ');
}

/** A variant slide's photo: a close-up of that exact tile, so the colour and texture are what changes. */
export function variantPrompt(productType: string, look: string): string {
  return [
    `Close-up product photograph of ${productType.toLowerCase()} tiles: ${look}.`,
    'Shot at a low 30-degree angle across the surface, interlocking edges visible, rich realistic rubber texture with fine granules.',
    'Dark studio background, soft directional light, high detail commercial product photography.',
    NO_TEXT,
  ].join(' ');
}
