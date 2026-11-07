// Real profit from ads: what was sold, minus VAT, minus the product cost, minus what the ads cost.
// Delivery is left out because only the items are counted, not the order total.

export interface SoldItem {
  amount: number; // after discounts, including VAT
  quantity: number;
  unitCost: number | null; // Shopify's "Cost per item"
  orderTotal: number; // what the order is worth now, after refunds
  orderRefunded: number;
}

export interface ProfitSettings {
  vatPercent: number;
  roughMarginPercent: number | null; // used for items with no cost
}

/** Null when an item has no cost and no rough margin is set: a guess must not look like a real number. */
export function profitFromAds(items: SoldItem[], spend: number, settings: ProfitSettings): number | null {
  let profit = -spend;
  for (const item of items) {
    // A part refund isn't recorded per item, so each item keeps the share of the order that was not refunded.
    const kept = item.orderTotal + item.orderRefunded > 0 ? item.orderTotal / (item.orderTotal + item.orderRefunded) : 0;
    const net = (item.amount * kept) / (1 + settings.vatPercent / 100);
    if (item.unitCost !== null) profit += net - item.unitCost * item.quantity * kept;
    else if (settings.roughMarginPercent !== null) profit += net * (settings.roughMarginPercent / 100);
    else return null;
  }
  return Math.round(profit * 100) / 100;
}
