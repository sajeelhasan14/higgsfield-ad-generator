// Makes ONE paid AI picture for a real product, with exactly the prompt and settings the worker uses,
// then renders its post, so you can judge the AI result before generating ads for real.
// Usage: npm run try:higgsfield -- "x brace"   (a product whose title contains the text)
// Saved in preview/ai/: the original photo, the AI picture, the post and the request details.
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildCaption } from '@/lib/ads/caption';
import { heroRequest } from '@/lib/ads/generate';
import { download, toDataUri } from '@/lib/ads/images';
import { renderPost } from '@/lib/ads/post';
import { HIGGSFIELD_MODEL } from '@/lib/config';
import { getPool } from '@/lib/db';
import { submit, waitForImages } from '@/lib/higgsfield/client';
import { findProduct } from './find-product';

const DIR = 'preview/ai';

async function main() {
  const text = process.argv[2];
  if (!text) throw new Error('Name a product, e.g.: npm run try:higgsfield -- "x brace"   (this costs 1 image)');
  const product = await findProduct(text);
  const request = heroRequest(product, product.imageUrl);

  console.log(`"${product.title}": sending its photo to ${HIGGSFIELD_MODEL} (1 paid image)…`);
  const started = Date.now();
  const requestId = await submit(HIGGSFIELD_MODEL, request);
  const [url] = await waitForImages(requestId);
  if (!url) throw new Error(`Request ${requestId} finished without an image`);

  mkdirSync(DIR, { recursive: true });
  const picture = await download(url);
  writeFileSync(`${DIR}/original.jpg`, await download(product.imageUrl));
  writeFileSync(`${DIR}/picture.png`, picture);
  writeFileSync(`${DIR}/post.jpg`, await renderPost(product, await toDataUri(picture)));
  writeFileSync(`${DIR}/caption.txt`, buildCaption(product));
  writeFileSync(`${DIR}/request.json`, JSON.stringify({ requestId, model: HIGGSFIELD_MODEL, product: product.title, request, url }, null, 2));
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s → compare ${DIR}/original.jpg with ${DIR}/picture.png, see ${DIR}/post.jpg`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
