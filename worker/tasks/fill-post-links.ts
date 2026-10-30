import { listPostsWithoutPermalink, savePermalink } from '@/lib/posts/repository';
import type { Post } from '@/lib/posts/types';
import { postPermalink } from '@/lib/publishing/meta';

const CHECK_EVERY_MS = 60 * 60 * 1000;
let nextCheck = 0;

/**
 * Asks Meta for a post's web address and saves it. Never throws: the post is already live, so a missing
 * link must not mark it failed. Returns whether it worked.
 */
export async function savePostLink(post: Pick<Post, 'id' | 'platform'>, externalId: string): Promise<boolean> {
  try {
    const permalink = await postPermalink(post.platform, externalId);
    if (!permalink) return false;
    await savePermalink(post.id, permalink);
    return true;
  } catch (err) {
    console.warn(`No link yet for post ${post.id}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/**
 * Once an hour (and right after the worker starts): fills in links that could not be fetched right after
 * posting, and for posts published before links were saved. Hourly, so a Meta error isn't retried every tick.
 */
export async function fillPostLinks(): Promise<void> {
  if (Date.now() < nextCheck) return;
  nextCheck = Date.now() + CHECK_EVERY_MS;
  for (const post of await listPostsWithoutPermalink()) {
    if (post.externalId) await savePostLink(post, post.externalId);
  }
}
