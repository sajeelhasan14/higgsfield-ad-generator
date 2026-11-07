// Settings a person changes on the Autopilot page. Saved in the database, so the worker sees a change without a restart.
// The environment values in lib/config.ts are only the starting values, until someone saves here.
// Secret keys are not here on purpose: they stay in the server's .env.local.
import { AUTO_CREATE_ADS_PER_WEEK, AUTOPILOT_LEVEL, MAX_AD_COST_PER_SALE } from '@/lib/config';
import { query, withTransaction } from '@/lib/db';

export type AutopilotMode = 'advice' | 'pause' | 'full';

export interface Settings {
  mode: AutopilotMode;
  weeklyAds: number;
  maxCostPerSale: number;
  /** true: ads the autopilot made that pass the check are posted with no click. Off until a person turns it on. */
  autoPost: boolean;
}

const MODES: AutopilotMode[] = ['advice', 'pause', 'full'];
const MAX_WEEKLY_ADS = 10;
const MAX_COST_LIMIT = 10000;

/** Turns what the form sent into settings, or throws a message to show next to the button. */
export function parseSettings(form: { mode: string; weeklyAds: string; maxCostPerSale: string; autoPost: string }): Settings {
  if (!MODES.includes(form.mode as AutopilotMode)) throw new Error('Choose a mode from the list');
  const weeklyAds = Number(form.weeklyAds);
  if (!Number.isInteger(weeklyAds) || weeklyAds < 0 || weeklyAds > MAX_WEEKLY_ADS) throw new Error(`Weekly ads must be a whole number from 0 to ${MAX_WEEKLY_ADS}`);
  const maxCostPerSale = Number(form.maxCostPerSale);
  if (!Number.isFinite(maxCostPerSale) || maxCostPerSale < 0 || maxCostPerSale > MAX_COST_LIMIT) throw new Error(`The limit per sale must be from 0 to ${MAX_COST_LIMIT}`);
  // Launching needs a limit to judge ads by, so "full" without one could never work properly.
  if (form.mode !== 'advice' && maxCostPerSale === 0) throw new Error('Set a limit per sale before leaving Advice only');
  return { mode: form.mode as AutopilotMode, weeklyAds, maxCostPerSale, autoPost: form.autoPost === 'on' };
}

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM app_state WHERE key LIKE 'setting:%'`);
  const saved = new Map(rows.map((row) => [row.key.slice('setting:'.length), row.value]));
  const mode = saved.get('mode');
  return {
    mode: MODES.includes(mode as AutopilotMode) ? (mode as AutopilotMode) : AUTOPILOT_LEVEL,
    weeklyAds: saved.has('weeklyAds') ? Number(saved.get('weeklyAds')) : AUTO_CREATE_ADS_PER_WEEK,
    maxCostPerSale: saved.has('maxCostPerSale') ? Number(saved.get('maxCostPerSale')) : MAX_AD_COST_PER_SALE,
    autoPost: saved.get('autoPost') === 'true',
  };
}

/** Saves the settings and logs what changed. */
export async function saveSettings(next: Settings): Promise<void> {
  const before = await getSettings();
  const changes = [
    before.mode !== next.mode && `mode from ${before.mode} to ${next.mode}`,
    before.weeklyAds !== next.weeklyAds && `weekly ads from ${before.weeklyAds} to ${next.weeklyAds}`,
    before.maxCostPerSale !== next.maxCostPerSale && `limit per sale from £${before.maxCostPerSale} to £${next.maxCostPerSale}`,
    before.autoPost !== next.autoPost && `auto-post to ${next.autoPost ? 'on' : 'off'}`,
  ].filter(Boolean);
  if (changes.length === 0) return;

  await withTransaction(async (client) => {
    for (const [key, value] of Object.entries(next)) {
      await client.query(`INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [`setting:${key}`, String(value)]);
    }
    await client.query(`INSERT INTO autopilot_log (action, reason) VALUES ('settings', $1)`, [`A person changed ${changes.join(', ')}`]);
  });
}
