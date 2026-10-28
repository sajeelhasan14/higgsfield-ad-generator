// Posts ONE ready ad for real, then deletes it when you press Enter. Run it on the server, where the ad images
// are, because Meta downloads the image from the public address. Facebook by default; Instagram with --instagram
// (as a carousel when the ad has one), exactly as the worker would post it.
// Usage: npm run meta:test-post                       the newest ready ad, to the Facebook Page
//        npm run meta:test-post -- 12                 ad 12
//        npm run meta:test-post -- --instagram        to Instagram instead
//        npm run meta:test-post -- --delete <post id> [--instagram]   removes a test post left behind
// Deleting an Instagram post needs the token permission instagram_manage_contents; without it the post stays up
// and has to be deleted in the Instagram app.
import { createInterface } from 'node:readline/promises';
import { getAd, listAdsByStatus } from '@/lib/ads/repository';
import { getPool } from '@/lib/db';
import { sendAd } from '@/lib/publishing';
import { graph, pageAccessToken } from '@/lib/publishing/meta';

const instagram = process.argv.includes('--instagram');
const where = instagram ? 'Instagram' : 'the Facebook Page';

async function deletePost(postId: string): Promise<void> {
  const token = await pageAccessToken();
  try {
    await graph(postId, { access_token: token }, 'DELETE');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Meta refused to delete post ${postId} (${reason}). It is still on ${where}: delete it there by hand.`);
  }
  // Meta answers "does not exist" for a deleted post, so a successful read means it is still there.
  const stillThere = await graph(postId, { fields: 'id', access_token: token }).then(() => true, () => false);
  if (stillThere) throw new Error(`Meta still shows post ${postId}; delete it on ${where} by hand.`);
  console.log(`Deleted: post ${postId} is gone from ${where}.`);
}

/** A link to open the post: Facebook post IDs work in the address, Instagram needs its permalink. */
async function postLink(postId: string): Promise<string> {
  if (!instagram) return `https://www.facebook.com/${postId}`;
  const media = await graph<{ permalink?: string }>(postId, { fields: 'permalink', access_token: await pageAccessToken() }).catch(() => null);
  return media?.permalink ?? `(Instagram post ${postId}; open @gymflooring.uk to see it)`;
}

async function main() {
  const deleteFlag = process.argv.indexOf('--delete');
  if (deleteFlag > -1) return deletePost(process.argv[deleteFlag + 1]);

  const adId = process.argv.slice(2).find((arg) => /^\d+$/.test(arg));
  const ad = adId ? await getAd(adId) : (await listAdsByStatus(['ready']))[0];
  if (!ad?.images[0]) throw new Error('No ready ad with an image. Generate one on the dashboard first.');

  const carousel = instagram && ad.images.length > 2 ? ` as a carousel of ${ad.images.length - 1} slides` : '';
  console.log(`Posting ad ${ad.id} to ${where}${carousel}…`);
  const postId = await sendAd(ad, instagram ? 'instagram' : 'facebook');
  console.log(`\nPOSTED: ${await postLink(postId)}`);
  console.log(`If this script stops before deleting, run: npm run meta:test-post -- --delete ${postId}${instagram ? ' --instagram' : ''}\n`);

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  await prompt.question('Check the post, then press Enter to delete it… ');
  prompt.close();
  await deletePost(postId);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
