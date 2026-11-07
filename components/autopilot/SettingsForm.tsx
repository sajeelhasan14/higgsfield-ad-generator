'use client';

// The settings on the Autopilot page. Anything that lets the app spend by itself asks "are you sure?" first.
import { useActionState } from 'react';
import { saveSettingsAction } from '@/app/(dashboard)/autopilot/actions';
import type { Settings } from '@/lib/autopilot/settings';

const MODES = [
  { value: 'advice', label: 'Advice only: it suggests, you decide' },
  { value: 'pause', label: 'Pauses poor ads by itself' },
  { value: 'full', label: 'Launches ads and changes budgets by itself' },
];

const FIELD = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand sm:w-72';

function Row({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{help}</span>
      </span>
      {children}
    </label>
  );
}

/** What the person should know before saving, or null when nothing here can start spending. */
function warning(before: Settings, form: FormData): string | null {
  const notes: string[] = [];
  const mode = String(form.get('mode'));
  if (mode !== before.mode && mode === 'pause') notes.push('The app will switch poor ads off by itself.');
  if (mode !== before.mode && mode === 'full') notes.push('The app will launch ads and raise budgets by itself, spending real money up to the limits.');
  if (before.weeklyAds === 0 && Number(form.get('weeklyAds')) > 0) notes.push(`The app will make ${form.get('weeklyAds')} ads within the hour, using paid AI images.`);
  if (!before.autoPost && form.get('autoPost') === 'on') notes.push('Ads the app made that pass the AI check will post to Facebook and Instagram with nobody reviewing them, including any waiting on Review now.');
  return notes.length ? `${notes.join(' ')} Do you have the client's OK?` : null;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [result, action, pending] = useActionState(saveSettingsAction, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const note = warning(settings, new FormData(e.currentTarget));
        if (note && !window.confirm(note)) e.preventDefault();
      }}
      className="rounded-2xl border border-line bg-surface"
    >
      <div className="divide-y divide-line">
        <Row label="Mode" help="How far the app may go by itself">
          <select name="mode" defaultValue={settings.mode} className={FIELD}>
            {MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Weekly ads" help="New ads made each week for Review, from 0 (off) to 10. One in every 3 tests a low seller. Each uses a paid AI image">
          <input type="number" name="weeklyAds" defaultValue={settings.weeklyAds} min={0} max={10} step={1} required className={FIELD} />
        </Row>
        <Row label="Auto-post" help="On: ads the app makes each week that pass the AI check post to Facebook and Instagram with no click. Paid ads are not affected">
          <select name="autoPost" defaultValue={settings.autoPost ? 'on' : 'off'} className={FIELD}>
            <option value="off">Off: I approve each ad</option>
            <option value="on">On: post automatically</option>
          </select>
        </Row>
        <Row label="Limit per sale (£)" help="Not a budget. When an ad's spend per sale goes above this, the app advises pausing it. 0 means not set">
          <input type="number" name="maxCostPerSale" defaultValue={settings.maxCostPerSale} min={0} step={1} required className={FIELD} />
        </Row>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {pending ? 'Saving…' : 'Save settings'}
        </button>
        {result && <span className={`text-xs ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</span>}
      </div>
    </form>
  );
}
