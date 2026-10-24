// Generates AI pictures for the sample product with Higgsfield, then renders the full carousel with them.
// Usage:
//   npm run try:higgsfield -- --only hero    generate just the hero picture (1 paid image)
//   npm run try:higgsfield                   generate whatever is missing (up to 5 paid images)
//   npm run try:higgsfield -- --fresh v4     throw away and regenerate one picture
// Pictures are saved in preview/ai/ and reused on later runs, so re-rendering the slides costs nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderCarousel } from '@/lib/ads/carousel';
import { toDataUri } from '@/lib/ads/images';
import { heroPrompt, variantPrompt } from '@/lib/ads/prompts';
import { submit, waitForImages } from '@/lib/higgsfield/client';
import { sampleLooks, sampleProduct as product } from './sample-product';

const MODEL = 'higgsfield-ai/soul/standard';
const MAX_PAID_IMAGES_PER_RUN = 6; // safety cap: this script never pays for more than this in one run
const DIR = 'preview/ai';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const fresh = args.includes('--fresh') ? args[args.indexOf('--fresh') + 1] : null;

const pictures = [
  { name: 'hero', prompt: heroPrompt(product.productType, sampleLooks.hero) },
  ...product.variants.map((v) => ({ name: v.id, prompt: variantPrompt(product.productType, sampleLooks[v.id]) })),
];

async function generate(name: string, prompt: string): Promise<void> {
  const started = Date.now();
  console.log(`Generating "${name}"…`);
  // The API offers no 4:5, so we ask for 3:4 (slightly taller); the slides crop it to fit.
  const requestId = await submit(MODEL, { prompt, aspect_ratio: '3:4', resolution: '1080p', num_images: 1 });
  const [url] = await waitForImages(requestId);
  if (!url) throw new Error(`Request ${requestId} finished without an image`);

  // Higgsfield deletes outputs after 7 days, so keep our own copy.
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`${DIR}/${name}.jpg`, bytes);
  writeFileSync(`${DIR}/${name}.json`, JSON.stringify({ requestId, model: MODEL, prompt, url }, null, 2));
  console.log(`  saved ${DIR}/${name}.jpg (${Math.round((Date.now() - started) / 1000)}s, request ${requestId})`);
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const wanted = pictures.filter((p) => (!only || p.name === only) && (p.name === fresh || !existsSync(`${DIR}/${p.name}.jpg`)));
  if (wanted.length > MAX_PAID_IMAGES_PER_RUN) throw new Error(`Refusing to generate ${wanted.length} images in one run (cap ${MAX_PAID_IMAGES_PER_RUN})`);
  console.log(wanted.length ? `${wanted.length} paid image(s) to generate` : 'All pictures already saved, nothing to pay for');

  for (const p of wanted) await generate(p.name, p.prompt);

  // Render with whatever exists; a missing variant picture falls back to the hero picture.
  if (!existsSync(`${DIR}/hero.jpg`)) return;
  const saved = (name: string) => (existsSync(`${DIR}/${name}.jpg`) ? readFileSync(`${DIR}/${name}.jpg`) : null);
  const variants: Record<string, string> = {};
  for (const v of product.variants) {
    const bytes = saved(v.id);
    if (bytes) variants[v.id] = await toDataUri(bytes);
  }
  const slides = await renderCarousel(product, { hero: await toDataUri(saved('hero')!), variants });
  mkdirSync('preview/ai-ad', { recursive: true });
  slides.forEach((jpeg, i) => writeFileSync(`preview/ai-ad/slide-${i + 1}.jpg`, jpeg));
  console.log(`Rendered ${slides.length} slides into preview/ai-ad/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
