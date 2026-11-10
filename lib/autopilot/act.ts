// What the autopilot does by itself. Hourly, from the worker. The level decides how far it may go:
//   advice: nothing here changes an ad.
//   pause:  also switches off ads the rules say to pause (Stage 4).
//   full:   also raises budgets and launches ads (Stage 5).
import { AUTO_LAUNCH_WITHOUT_REVIEW } from '@/lib/config';
import { pausePaidAd, promoteAd, raisePaidAdBudget, switchPaidAd } from '@/lib/paid-ads/promote';
import { getPaidAd, listActivePaidAds } from '@/lib/paid-ads/repository';
import { readMetaAds } from '@/lib/publishing/meta-ads';
import { sendAlert } from './alerts';
import { writeWeeklyInsight } from './insights';
import { listRecommendations } from './recommendations';
import { lastActionAt, listLaunchableAds, listRecentFailures, logDecision, logEvent } from './repository';
import { AUTO_LAUNCH_DAILY_BUDGET, autoLaunchDays, LAUNCH_GAP_MS } from './launch-plan';
import { getSettings, type AutopilotMode } from './settings';
import { isPaused, setPaused } from './state';

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

async function applyAdvice(mode: AutopilotMode): Promise<void> {
  for (const [paidAdId, advice] of await listRecommendations()) {
    const paid = await getPaidAd(paidAdId);
    if (!paid) continue;
    if (advice.kind === 'pause') {
      await pausePaidAd(paid, advice.reason);
      await logDecision('auto-pause', paidAdId, advice.reason);
      await sendAlert(`auto-pause-${paidAdId}`, `Ad #${paid.adId} was paused. ${advice.reason}`);
    } else if (advice.kind === 'increase' && mode === 'full') {
      await raisePaidAdBudget(paidAdId, advice.newBudget);
      await logDecision('auto-increase', paidAdId, advice.reason);
    }
  }
}

/** At most one launch a day, so results stay readable and spending rises slowly. */
async function launchNextAd(maxCostPerSale: number): Promise<void> {
  if (maxCostPerSale <= 0) return; // without the limit, nothing could ever judge the ad
  const last = await lastActionAt('auto-launch');
  if (last && Date.now() - last.getTime() < LAUNCH_GAP_MS) return;

  const budget = AUTO_LAUNCH_DAILY_BUDGET;
  const days = autoLaunchDays(maxCostPerSale);

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

export async function runAutopilot(): Promise<void> {
  await alertOnProblems();
  await writeWeeklyInsight();
  if (await isPaused()) return;
  const { mode, maxCostPerSale } = await getSettings();
  if (mode === 'advice') return;
  await applyAdvice(mode);
  if (mode === 'full') await launchNextAd(maxCostPerSale);
}
