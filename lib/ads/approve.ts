// Approving an ad: mark it approved and book it into the next free posting slot on every platform.
import { withTransaction } from '@/lib/db';
import { PLATFORMS, POSTING_TIMEZONE } from '@/lib/config';
import { insertPost, nextFreeSlot } from '@/lib/posts/repository';

// Any fixed number works; it just names "the scheduling lock" so all approvals wait for the same one.
const SCHEDULING_LOCK = 4201;

/** Approves a 'ready' ad and returns the time it will be posted. */
export async function approveAd(adId: string): Promise<Date> {
  return withTransaction(async (client) => {
    // One approval at a time picks a slot; the lock is released automatically when the transaction ends.
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEDULING_LOCK]);

    const { rows } = await client.query<{ status: string }>('SELECT status FROM ads WHERE id = $1 FOR UPDATE', [adId]);
    if (!rows[0]) throw new Error(`Ad ${adId} does not exist`);
    if (rows[0].status !== 'ready') throw new Error(`Ad ${adId} is '${rows[0].status}', only a 'ready' ad can be approved`);

    const at = await nextFreeSlot(client, POSTING_TIMEZONE);
    if (!at) throw new Error('No free posting slot in the next 60 days. Add more posting times.');

    // The same moment on every platform: one slot = one ad, on Instagram and Facebook together.
    for (const platform of PLATFORMS) await insertPost(client, adId, platform, at);
    await client.query(`UPDATE ads SET status = 'approved', approved_at = now() WHERE id = $1`, [adId]);
    return at;
  });
}
