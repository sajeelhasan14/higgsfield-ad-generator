import { Suspense } from 'react';
import { connection } from 'next/server';
import { ActionButton } from '@/components/ActionButton';
import { SettingsForm } from '@/components/autopilot/SettingsForm';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { listLog, listNewIdeas, spentThisMonth, type LogEntry } from '@/lib/autopilot/repository';
import { buildReport } from '@/lib/autopilot/report';
import { getSettings } from '@/lib/autopilot/settings';
import { isPaused, workerStatus } from '@/lib/autopilot/state';
import { AI_ENABLED, GENERATION_DRY_RUN, PUBLISH_DRY_RUN } from '@/lib/config';
import { formatPrice, formatSlotTime } from '@/lib/format';
import { dismissIdeaAction, pauseEverythingAction, resumeEverythingAction, useIdeaAction } from './actions';

const LEVELS = {
  advice: { name: 'Advice only', note: 'It suggests, you decide' },
  pause: { name: 'Pauses poor ads', note: 'It can switch poor ads off' },
  full: { name: 'Launches and adjusts ads', note: 'It can launch ads and change budgets' },
};

export default function AutopilotPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Autopilot" subtitle="what it may do · what it did · the off switch" />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Status />
      </Suspense>
    </div>
  );
}

function SetupRow({ label, ready, note }: { label: string; ready: boolean; note: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className={ready ? 'text-teal-700' : 'text-amber-700'}>{note}</span>
    </li>
  );
}

function LogList({ title, entries }: { title: string; entries: LogEntry[] }) {
  return (
    <section>
      <SectionTitle count={entries.length}>{title}</SectionTitle>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {entries.map((entry) => (
          <li key={entry.id} className="px-4 py-3 text-sm">
            <p>{entry.reason}</p>
            <p className="mt-0.5 text-xs text-muted">
              {entry.action.replace(/^alert:.*/, 'alert')} · {formatSlotTime(entry.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Status() {
  await connection(); // always fresh from the database
  const [paused, { seen, alive: workerOk }, spent, log, report, ideas, settings] = await Promise.all([
    isPaused(),
    workerStatus(),
    spentThisMonth(),
    listLog(),
    buildReport(),
    listNewIdeas(),
    getSettings(),
  ]);
  const decisions = log.filter((entry) => !entry.action.startsWith('alert:') && entry.action !== 'insight');
  const alerts = log.filter((entry) => entry.action.startsWith('alert:'));

  return (
    <>
      <div>
        {paused ? (
          <ActionButton action={resumeEverythingAction} fields={{}} label="Resume" tone="primary" confirm="Let the autopilot and scheduled posts run again? Ads stay off until you switch them on." />
        ) : (
          <ActionButton action={pauseEverythingAction} fields={{}} label="Pause everything" tone="danger" confirm="Switch off every running ad and stop the autopilot, launches and scheduled posts?" />
        )}
      </div>

      <StatRow
        stats={[
          { label: 'Status', value: paused ? 'Paused' : 'Running', tone: paused ? 'red' : 'green' },
          { label: 'Mode', value: LEVELS[settings.mode].name, tone: 'blue', note: LEVELS[settings.mode].note },
          { label: 'Spent this month', value: formatPrice(String(spent), 'GBP'), tone: 'amber' },
          { label: 'Worker', value: workerOk ? 'Working' : 'Not seen', tone: workerOk ? 'green' : 'red', note: seen ? `Last seen ${formatSlotTime(seen)}` : undefined },
        ]}
      />

      <section>
        <SectionTitle>Settings</SectionTitle>
        <SettingsForm settings={settings} />
      </section>

      <section>
        <SectionTitle>Connections</SectionTitle>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          <SetupRow label="AI pictures" ready={!GENERATION_DRY_RUN} note={GENERATION_DRY_RUN ? 'Test mode, uses the real photo' : 'Live, each picture is paid'} />
          <SetupRow label="Posting" ready={!PUBLISH_DRY_RUN} note={PUBLISH_DRY_RUN ? 'Test mode, nothing is posted' : 'Live, posts for real'} />
          <SetupRow label="AI check, captions and explanations" ready={AI_ENABLED} note={AI_ENABLED ? 'On' : 'Off, a person checks each ad'} />
        </ul>
      </section>

      <section>
        <SectionTitle>Last 7 days</SectionTitle>
        <p className="whitespace-pre-line rounded-2xl border border-line bg-surface p-4 text-sm">{report}</p>
      </section>

      {ideas.length > 0 && (
        <section>
          <SectionTitle count={ideas.length}>New ad ideas</SectionTitle>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{idea.idea}</span>
                <span className="flex gap-2">
                  <ActionButton action={useIdeaAction} fields={{ ideaId: idea.id }} label="Use" tone="primary" />
                  <ActionButton action={dismissIdeaAction} fields={{ ideaId: idea.id }} label="Dismiss" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {alerts.length > 0 && <LogList title="Alerts" entries={alerts} />}
      {decisions.length > 0 ? <LogList title="Decisions" entries={decisions} /> : <EmptyState>Nothing has been decided yet.</EmptyState>}
    </>
  );
}
