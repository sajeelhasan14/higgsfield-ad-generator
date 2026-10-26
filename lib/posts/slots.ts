// The daily posting times (in POSTING_TIMEZONE) that approved ads are booked into.
import { query } from '@/lib/db';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Every slot as "HH:MM", earliest first. */
export async function listSlots(): Promise<string[]> {
  const rows = await query<{ t: string }>(`SELECT to_char(time_of_day, 'HH24:MI') AS t FROM posting_slots ORDER BY time_of_day`);
  return rows.map((r) => r.t);
}

export async function addSlot(time: string): Promise<void> {
  if (!HH_MM.test(time)) throw new Error('Use a time like 09:30');
  await query('INSERT INTO posting_slots (time_of_day) VALUES ($1::time) ON CONFLICT DO NOTHING', [time]);
}

/** Removes a daily time. Posts already booked at that time keep their time. */
export async function removeSlot(time: string): Promise<void> {
  if (!HH_MM.test(time)) throw new Error('Use a time like 09:30');
  await query('DELETE FROM posting_slots WHERE time_of_day = $1::time', [time]);
}
