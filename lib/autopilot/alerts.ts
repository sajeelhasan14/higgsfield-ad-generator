// Tells people about problems. Every alert is saved, so it shows on the Autopilot page even with no webhook set up.
import { ALERT_WEBHOOK_URL } from '@/lib/config';
import { query } from '@/lib/db';

/** Sends a message to the webhook. "text" is what Slack reads, "content" is what Discord reads. A failed send must not stop the caller. */
export async function sendMessage(message: string): Promise<boolean> {
  if (!ALERT_WEBHOOK_URL) return false;
  try {
    const res = await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, content: message.slice(0, 2000) }),
    });
    if (!res.ok) console.error(`Alert webhook answered ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('Alert webhook failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** key names the problem, e.g. "post-12": the same problem alerts once every 2 days, not on every check. */
export async function sendAlert(key: string, message: string): Promise<void> {
  const action = `alert:${key}`;
  const recent = await query(`SELECT 1 FROM autopilot_log WHERE action = $1 AND created_at > now() - interval '2 days' LIMIT 1`, [action]);
  if (recent.length) return;
  await query(`INSERT INTO autopilot_log (action, reason) VALUES ($1, $2)`, [action, message]);
  console.error(`Alert: ${message}`);
  await sendMessage(`Ad Studio: ${message}`);
}
