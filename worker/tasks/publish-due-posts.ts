import { claimDuePosts, failStuckPosts, markAttemptFailed, markPublished } from '@/lib/posts/repository';
import { publishPost } from '@/lib/publishing';

/** Publishes every post whose time has come. */
export async function publishDuePosts(): Promise<void> {
  const stuck = await failStuckPosts();
  if (stuck) console.warn(`${stuck} post(s) were left half-published and are now marked failed`);

  for (const post of await claimDuePosts()) {
    try {
      const externalId = await publishPost(post);
      await markPublished(post.id, externalId);
      console.log(`Published post ${post.id} (ad ${post.adId}, ${post.platform})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markAttemptFailed(post, message);
      console.error(`Post ${post.id} failed (attempt ${post.attempts}): ${message}`);
    }
  }
}
