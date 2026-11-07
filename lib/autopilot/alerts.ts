// Problems are shown on the Autopilot page. Nothing is sent anywhere else.
import { query } from '@/lib/db';

/** key names the problem, e.g. "post-12": the same problem is listed once every 2 days, not on every check. */
export async function sendAlert(key: string, message: string): Promise<void> {
  const action = `alert:${key}`;
  const recent = await query(`SELECT 1 FROM autopilot_log WHERE action = $1 AND created_at > now() - interval '2 days' LIMIT 1`, [action]);
  if (recent.length) return;
  await query(`INSERT INTO autopilot_log (action, reason) VALUES ($1, $2)`, [action, message]);
  console.error(`Alert: ${message}`);
}
