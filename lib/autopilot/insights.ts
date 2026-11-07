// Once a week, the AI explains the numbers in plain words and suggests new caption angles.
// It only reads figures and writes text: it never changes an ad, and its ideas wait for a person to approve them.
import { z } from 'zod';
import { askAi } from '@/lib/ai/ask';
import { getDashboard } from '@/lib/analytics/repository';
import { AI_ENABLED } from '@/lib/config';
import { lastActionAt, listOptionResults, logEvent, saveIdeas } from './repository';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IDEA_LENGTH = 60;

const Insight = z.object({ explanation: z.string(), ideas: z.array(z.string()) });

const INSTRUCTIONS = `You explain advert results to a UK shop owner who is not technical, in two or three short sentences of plain English.
Use only the figures you are given. A cause you cannot prove from them must be worded as a possibility, using "may" or "could". Say so if there is too little data to judge. Do not tell them to change budgets.
Also give up to three short ideas for new advert angles, each a few words such as "quiet enough for flats", based on what sold. Give no ideas if nothing has sold.`;

/** Ideas need real sales behind them, and must be short enough to work as an angle. */
export function usableIdeas(ideas: string[], orders: number): string[] {
  if (orders === 0) return [];
  return ideas.map((idea) => idea.trim()).filter((idea) => idea && idea.length <= MAX_IDEA_LENGTH && !/[£$€]/.test(idea)).slice(0, 3);
}

export async function writeWeeklyInsight(): Promise<void> {
  if (!AI_ENABLED) return;
  const last = await lastActionAt('insight');
  if (last && Date.now() - last.getTime() < WEEK_MS) return;

  const { summary, ads } = await getDashboard(30);
  if (summary.spend <= 0) return; // nothing to explain yet, so nothing is paid for

  const facts = {
    last30Days: { spend: summary.spend, views: summary.impressions, linkClicks: summary.linkClicks, orders: summary.adOrders, revenueIncludingVatAndDelivery: summary.adRevenue },
    ads: ads.map((ad) => ({ product: ad.productTitle, spend: ad.spend, linkClicks: ad.linkClicks, orders: ad.orders, revenue: ad.revenue })),
    captionAngles: await listOptionResults('angle'),
  };
  const answer = await askAi(Insight, INSTRUCTIONS, [{ type: 'text', text: JSON.stringify(facts) }]);
  if (!answer) return;

  await logEvent('insight', answer.explanation);
  await saveIdeas(usableIdeas(answer.ideas, summary.adOrders));
}
