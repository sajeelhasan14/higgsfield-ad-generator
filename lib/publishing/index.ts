// Sends one post to its platform. The Meta code (Instagram + Facebook) will be added here.
import { PUBLISH_DRY_RUN } from '@/lib/config';
import type { Post } from '@/lib/posts/types';

/** Publishes the post and returns its ID on the platform. Throws if it could not be published. */
export async function publishPost(post: Post): Promise<string> {
  if (PUBLISH_DRY_RUN) {
    console.log(`[dry run] would post ad ${post.adId} to ${post.platform}`);
    return `dry-run-${post.platform}-${post.id}`;
  }
  // Refuse rather than pretend: a post must never be marked published without really being posted.
  throw new Error(`Publishing to ${post.platform} is not set up yet`);
}
