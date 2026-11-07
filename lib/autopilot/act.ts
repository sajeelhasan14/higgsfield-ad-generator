// What the autopilot does by itself. Hourly, from the worker. The level decides how far it may go:
//   advice: nothing here changes an ad, except the monthly limit, which always applies.
//   pause:  also switches off ads the rules say to pause (Stage 4).
//   full:   also raises budgets and launches ads (Stage 5).
import { ALERT_WEBHOOK_URL, AUTO_LAUNCH_WITHOUT_REVIEW, AUTOPILOT_LEVEL, MAX_AD_COST_PER_SALE } from '@/lib/config';
import { BUDGET_LIMITS, pausePaidAd, promoteAd, raisePaidAdBudget, switchPaidAd } from '@/lib/paid-ads/promote';
import { getPaidAd, listActivePaidAds } from '@/lib/paid-ads/repository';
import { readMetaAds } from '@/lib/publishing/meta-ads';
import { sendAlert, sendMessage } from './alerts';
import { listRecommendations } from './recommendations';
import { buildReport } from './report';
import { lastActionAt, listLaunchableAds, listRecentFailures, listRunningAdFacts, logDecision, logEvent, spentThisMonth } from './repository';
import { isPaused, setPaused } from './state';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Below this, an ad would take too long to reach a fair test, so nothing is launched. */
const MIN_LAUNCH_BUDGET = 5;

/** Switches off every running ad and stops the autopilot, launches and scheduled posts. One failed ad doesn't stop the rest. */
export async function pauseEverything(): Promise<string> {
  await setPaused(true);
  const running = (await listActivePaidAds()).filter((paid) => !paid.finished);
  const failed: string[] = [];
  for (const paid of running) {
    await pausePaidAd(paid, 'Pause everything was pressed').catch((err: Error) => failed.push(`#${paid.adId}: ${err.message}`));
  }
  await logEvent('pause-everything', `${running.length - failed.length} of ${running.length} running ads switched off`);
  if (failed.length) throw new Error(`These ads could not be switched off, so check Ads Manager now. ${failed.join(' ')}`);
  return `Everything is paused. ${running.length} ad${running.length === 1 ? '' : 's'} switched off.`;
}

/** Lets the autopilot run again. Ads stay off: a person chooses which to switch back on. */
export async function resumeEverything(): Promise<string> {
  await setPaused(false);
  await logEvent('resume-everything', 'A person resumed the autopilot');
  return 'Resumed. Ads stay off until you switch them on.';
}

async function enforceMonthlyLimit(): Promise<void> {
  const spent = await spentThisMonth();
  if (spent < BUDGET_LIMITS.maxMonthly) return;
  const reason = `The monthly limit of £${BUDGET_LIMITS.maxMonthly} is reached`;
  const running = (await listActivePaidAds()).filter((paid) => !paid.finished);
  for (const paid of running) await pausePaidAd(paid, reason);
  if (running.length) await logEvent('monthly-limit', `${reason}: ${running.length} ads switched off`);
}

async function applyAdvice(): Promise<void> {
  for (const [paidAdId, advice] of await listRecommendations()) {
    const paid = await getPaidAd(paidAdId);
    if (!paid) continue;
    if (advice.kind === 'pause') {
      await pausePaidAd(paid, advice.reason);
      await logDecision('auto-pause', paidAdId, advice.reason);
      await sendAlert(`auto-pause-${paidAdId}`, `Ad #${paid.adId} was paused. ${advice.reason}`);
    } else if (advice.kind === 'increase' && AUTOPILOT_LEVEL === 'full') {
      await raisePaidAdBudget(paidAdId, advice.newBudget);
      await logDecision('auto-increase', paidAdId, advice.reason);
    }
  }
}

/** At most one launch a day, so results stay readable and spending rises slowly. */
async function launchNextAd(): Promise<void> {
  if (MAX_AD_COST_PER_SALE <= 0) return; // without the limit, nothing could ever judge the ad
  const last = await lastActionAt('auto-launch');
  if (last && Date.now() - last.getTime() < DAY_MS) return;

  const budget = BUDGET_LIMITS.maxDaily - (await listRunningAdFacts()).reduce((sum, ad) => sum + ad.dailyBudget, 0);
  if (budget < MIN_LAUNCH_BUDGET) return;
  // Long enough to reach the limit per sale, so the ad gets a fair test.
  const days = Math.min(BUDGET_LIMITS.maxDays, Math.ceil(MAX_AD_COST_PER_SALE / budget) + 1);

  for (const adId of await listLaunchableAds(AUTO_LAUNCH_WITHOUT_REVIEW)) {
    try {
      const paidAdId = await promoteAd(adId, budget, days);
      await switchPaidAd(paidAdId, true);
      await logEvent('auto-launch', `Ad #${adId} launched at £${budget} a day for ${days} days`, { adId });
      return;
    } catch (err) {
      await sendAlert(`launch-${adId}`, `Ad #${adId} could not be launched: ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function alertOnProblems(): Promise<void> {
  for (const failure of await listRecentFailures()) await sendAlert(failure.key, failure.message);

  const onMeta = (await listActivePaidAds()).filter((paid) => !paid.finished && paid.metaAdId && paid.campaignId);
  const live = await readMetaAds(onMeta.map((paid) => ({ adId: paid.metaAdId!, campaignId: paid.campaignId! })));
  for (const paid of onMeta) {
    const status = live.get(paid.metaAdId!)?.effectiveStatus;
    if (status === 'DISAPPROVED' || status === 'WITH_ISSUES') await sendAlert(`meta-${paid.id}`, `Meta reports ad #${paid.adId} as ${status}. Check Ads Manager.`);
  }
}

async function sendWeeklyReport(): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;
  const last = await lastActionAt('report');
  if (last && Date.now() - last.getTime() < 7 * DAY_MS) return;
  const report = await buildReport();
  await logEvent('report', report);
  await sendMessage(report);
}

export async function runAutopilot(): Promise<void> {
  await alertOnProblems();
  await sendWeeklyReport();
  if (await isPaused()) return;
  await enforceMonthlyLimit();
  if (AUTOPILOT_LEVEL === 'advice') return;
  await applyAdvice();
  if (AUTOPILOT_LEVEL === 'full') await launchNextAd();
}
