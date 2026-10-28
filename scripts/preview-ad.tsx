// Renders the post for a real product into preview/, using its real Shopify photo: no AI, costs nothing.
// Usage: npm run preview:ad                    a random product
//        npm run preview:ad -- "trough planter"   a product whose title contains the text
//        npm run preview:ad -- "brace estate" storage/ads/12/a4-picture.jpg   with an AI picture made earlier
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildCaption } from '@/lib/ads/caption';
import { toDataUri } from '@/lib/ads/images';
import { renderAd } from '@/lib/ads/post';
import { getPool } from '@/lib/db';
import { findProduct } from './find-product';

async function main() {
  const product = await findProduct(process.argv[2]);
  const started = Date.now();
  const picture = process.argv[3] ? readFileSync(process.argv[3]) : product.imageUrl;
  const { post, carousel } = await renderAd(product, await toDataUri(picture));
  mkdirSync('preview', { recursive: true });
  writeFileSync('preview/post.jpg', post);
  for (const [i, slide] of carousel.entries()) writeFileSync(`preview/slide-${i + 1}.jpg`, slide);
  writeFileSync('preview/caption.txt', buildCaption(product));
  const slides = carousel.length ? ` and an Instagram carousel (preview/slide-1…${carousel.length}.jpg)` : '';
  console.log(`"${product.title}" → preview/post.jpg${slides} and preview/caption.txt (${Date.now() - started} ms)`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
