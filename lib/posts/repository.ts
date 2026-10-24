// All SQL for posts: finding a free slot, creating posts, and the worker's claim/finish steps.
import type { PoolClient } from 'pg';
import { query } from '@/lib/db';
import type { Platform, Post } from './types';

const POST_COLUMNS = `id, ad_id AS "adId", platform, kind, status, scheduled_at AS "scheduledAt", run_at AS "runAt",
  attempts, last_error AS "lastError", external_id AS "externalId", published_at AS "publishedAt"`;

/** After this many failed tries a post stays failed. */
export const MAX_ATTEMPTS = 3;

/**
 * The earliest posting slot (from posting_slots, in the given timezone) in the next 60 days that no
 * other ad is booked into. Null when every slot is taken or no slots are set.
 * Run inside the scheduling transaction, after taking the scheduling lock, so two approvals can't pick the same slot.
 */
export async function nextFreeSlot(client: PoolClient, timezone: string): Promise<Date | null> {
  // (date + time) is a local time with no zone; "AT TIME ZONE tz" turns it into a real moment in that zone.
  const { rows } = await client.query<{ at: Date }>(
    `WITH candidates AS (
       SELECT (day::date + s.time_of_day) AT TIME ZONE $1 AS at
       FROM generate_series((now() AT TIME ZONE $1)::date, (now() AT TIME ZONE $1)::date + 60, interval '1 day') AS day
       CROSS JOIN posting_slots s
     )
     SELECT at FROM candidates c
     WHERE c.at > now() + interval '5 minutes'
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.scheduled_at = c.at AND p.status <> 'cancelled')
     ORDER BY at
     LIMIT 1`,
    [timezone],
  );
  return rows[0]?.at ?? null;
}

export async function insertPost(client: PoolClient, adId: string, platform: Platform, at: Date): Promise<void> {
  await client.query(
    `INSERT INTO posts (ad_id, platform, scheduled_at, run_at) VALUES ($1, $2, $3, $3)`,
    [adId, platform, at],
  );
}

/**
 * Marks up to `limit` due posts as 'publishing' and returns them, in one statement.
 * SKIP LOCKED: if another worker is claiming at the same moment, each post goes to only one of them.
 */
export async function claimDuePosts(limit = 5): Promise<Post[]> {
  return query<Post>(
    `UPDATE posts SET status = 'publishing', attempts = attempts + 1, claimed_at = now()
     WHERE id IN (
       SELECT id FROM posts
       WHERE status = 'scheduled' AND run_at <= now()
       ORDER BY run_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING ${POST_COLUMNS}`,
    [limit],
  );
}

export async function markPublished(postId: string, externalId: string): Promise<void> {
  await query(
    `UPDATE posts SET status = 'published', external_id = $2, published_at = now(), last_error = NULL WHERE id = $1`,
    [postId, externalId],
  );
}

/** A failed try: back to 'scheduled' with a later run_at (5 min, then 10 min), or 'failed' after the last attempt. */
export async function markAttemptFailed(post: Post, error: string): Promise<void> {
  const giveUp = post.attempts >= MAX_ATTEMPTS;
  await query(
    `UPDATE posts SET
       status = CASE WHEN $3 THEN 'failed' ELSE 'scheduled' END,
       run_at = now() + make_interval(mins => 5 * $4),
       last_error = $2
     WHERE id = $1`,
    [post.id, error, giveUp, post.attempts],
  );
}

/**
 * Posts left in 'publishing' because the worker stopped mid-post. We can't tell whether Meta received
 * them, and retrying could post twice, so they are marked failed for a person to check.
 */
export async function failStuckPosts(olderThanMinutes = 10): Promise<number> {
  const rows = await query(
    `UPDATE posts SET status = 'failed',
       last_error = 'The worker stopped while publishing. Check Instagram/Facebook before retrying, it may already be posted.'
     WHERE status = 'publishing'
       AND claimed_at < now() - make_interval(mins => $1)
     RETURNING id`,
    [olderThanMinutes],
  );
  return rows.length;
}
