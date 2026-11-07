import { Suspense } from 'react';
import { connection } from 'next/server';
import { ActionButton } from '@/components/ActionButton';
import { EmptyState, PageHeader, SectionTitle, StatRow } from '@/components/shell/PageParts';
import { listLog, spentThisMonth, type LogEntry } from '@/lib/autopilot/repository';
import { buildReport } from '@/lib/autopilot/report';
import { isPaused, workerStatus } from '@/lib/autopilot/state';
import { AD_CHECK_ENABLED, ALERT_WEBHOOK_URL, AUTO_CREATE_ADS_PER_WEEK, AUTOPILOT_LEVEL, HEALTHCHECK_PING_URL, MAX_AD_COST_PER_SALE } from '@/lib/config';
import { formatPrice, formatSlotTime } from '@/lib/format';
import { BUDGET_LIMITS } from '@/lib/paid-ads/promote';
import { pauseEverythingAction, resumeEverythingAction } from './actions';

const LEVELS = { advice: 'Advice only', pause: 'Pauses poor ads', full: 'Launches and adjusts ads' };

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
  const [paused, { seen, alive: workerOk }, spent, log, report] = await Promise.all([isPaused(), workerStatus(), spentThisMonth(), listLog(), buildReport()]);
  const decisions = log.filter((entry) => !entry.action.startsWith('alert:'));
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
          { label: 'Level', value: LEVELS[AUTOPILOT_LEVEL], tone: 'blue' },
          { label: 'Spent this month', value: formatPrice(String(spent), 'GBP'), tone: 'amber', note: `Limit £${BUDGET_LIMITS.maxMonthly} a month, £${BUDGET_LIMITS.maxDaily} a day` },
          { label: 'Worker', value: workerOk ? 'Working' : 'Not seen', tone: workerOk ? 'green' : 'red', note: seen ? `Last seen ${formatSlotTime(seen)}` : undefined },
        ]}
      />

      <section>
        <SectionTitle>Setup</SectionTitle>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          <SetupRow label="Weekly ads" ready={AUTO_CREATE_ADS_PER_WEEK > 0} note={AUTO_CREATE_ADS_PER_WEEK > 0 ? `${AUTO_CREATE_ADS_PER_WEEK} a week` : 'Off'} />
          <SetupRow label="Limit per sale" ready={MAX_AD_COST_PER_SALE > 0} note={MAX_AD_COST_PER_SALE > 0 ? `£${MAX_AD_COST_PER_SALE}` : 'Not set, so no advice'} />
          <SetupRow label="Automatic ad check" ready={AD_CHECK_ENABLED} note={AD_CHECK_ENABLED ? 'On' : 'Off, a person checks each ad'} />
          <SetupRow label="Alerts" ready={Boolean(ALERT_WEBHOOK_URL)} note={ALERT_WEBHOOK_URL ? 'On' : 'Shown here only'} />
          <SetupRow label="Worker monitor" ready={Boolean(HEALTHCHECK_PING_URL)} note={HEALTHCHECK_PING_URL ? 'On' : 'Off'} />
        </ul>
      </section>

      <section>
        <SectionTitle>Last 7 days</SectionTitle>
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm">{report}</p>
      </section>

      {alerts.length > 0 && <LogList title="Alerts" entries={alerts} />}
      {decisions.length > 0 ? <LogList title="Decisions" entries={decisions} /> : <EmptyState>Nothing has been decided yet.</EmptyState>}
    </>
  );
}
