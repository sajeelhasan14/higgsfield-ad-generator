// The plain summary for the client, shown on the Autopilot page and sent weekly when a webhook is set.
import { getDashboard } from '@/lib/analytics/repository';
import { formatPrice } from '@/lib/format';

export async function buildReport(days = 7): Promise<string> {
  const { summary, profit } = await getDashboard(days);
  const money = (amount: number) => formatPrice(String(amount), summary.currency);
  const orders = `${summary.adOrders} order${summary.adOrders === 1 ? '' : 's'}`;
  const profitLine = profit === null ? 'Real profit is not shown yet because product costs are missing.' : `Real profit after VAT, product costs and ad spend was ${money(profit)}.`;
  return `In the last ${days} days you spent ${money(summary.spend)} on ads, which brought ${summary.linkClicks.toLocaleString('en-GB')} clicks and ${orders} worth ${money(summary.adRevenue)}. ${profitLine}`;
}
