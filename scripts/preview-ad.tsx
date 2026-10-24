// Renders a sample carousel into preview/ so the design can be checked without Shopify or Higgsfield.
// Usage: npm run preview:ad   (then open the JPEGs in preview/)
// The pictures are generated rubber-tile textures, stand-ins until real product photos and AI images exist.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { renderCarousel } from '@/lib/ads/carousel';
import { toDataUri } from '@/lib/ads/images';
import { sampleProduct as product } from './sample-product';

/** A speckled rubber texture: a base colour with random flecks, like EPDM gym tiles. */
async function rubberTexture(base: number[], flecks: number[][], fleckRate: number, size = 1080): Promise<Buffer> {
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const fleck = Math.random() < fleckRate ? flecks[Math.floor(Math.random() * flecks.length)] : null;
    const shade = (Math.random() - 0.5) * 24;
    const colour = fleck ?? base.map((c) => c + shade);
    pixels.set(colour.map((c) => Math.max(0, Math.min(255, c))), i * 3);
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).blur(1.1).jpeg().toBuffer();
}

async function main() {
  const textures = {
    v1: await rubberTexture([28, 28, 30], [[200, 200, 205], [120, 120, 125]], 0.05),
    v2: await rubberTexture([150, 152, 156], [[60, 60, 64], [220, 220, 224]], 0.12),
    v3: await rubberTexture([24, 24, 26], [[60, 60, 62]], 0.03),
    v4: await rubberTexture([26, 26, 28], [[200, 60, 30], [230, 90, 40]], 0.06),
  };

  const images = {
    hero: await toDataUri(await rubberTexture([30, 32, 36], [[47, 123, 255], [140, 140, 150]], 0.04)),
    variants: Object.fromEntries(await Promise.all(Object.entries(textures).map(async ([id, t]) => [id, await toDataUri(t)] as const))),
  };

  const started = Date.now();
  const slides = await renderCarousel(product, images);
  mkdirSync('preview', { recursive: true });
  slides.forEach((jpeg, i) => writeFileSync(`preview/slide-${i + 1}.jpg`, jpeg));
  console.log(`Rendered ${slides.length} slides into preview/ in ${Date.now() - started} ms`);
}

main();
