// Stage 6: new ads use what has worked. A "look" is one of the photo styles in lib/ads/prompts.ts.
// Only sold results count: with too little data the app keeps trying the looks it knows least about.

export interface LookResult {
  productType: string;
  look: number;
  spend: number;
  orders: number;
}

/** Adds up the rows for each look. */
function totals(rows: LookResult[], lookCount: number) {
  return Array.from({ length: lookCount }, (_, look) => {
    const mine = rows.filter((r) => r.look === look);
    return { look, spend: mine.reduce((sum, r) => sum + r.spend, 0), orders: mine.reduce((sum, r) => sum + r.orders, 0) };
  });
}

/** The look with the lowest cost per sale within the limit, for this type of product if it has sold, otherwise for any product. */
export function chooseLook(results: LookResult[], productType: string, maxCostPerSale: number, lookCount: number): { look: number; reason: string } {
  const proven = (rows: LookResult[]) =>
    totals(rows, lookCount)
      .filter((t) => t.orders > 0 && t.spend / t.orders <= maxCostPerSale)
      .sort((a, b) => a.spend / a.orders - b.spend / b.orders)[0];

  const sameType = proven(results.filter((r) => r.productType === productType));
  if (sameType) return { look: sameType.look, reason: `uses photo style ${sameType.look + 1}, the best seller for this type of product` };
  const anyType = proven(results);
  if (anyType) return { look: anyType.look, reason: `uses photo style ${anyType.look + 1}, the best seller so far` };

  const leastTried = totals(results, lookCount).sort((a, b) => a.spend - b.spend || a.look - b.look)[0];
  return { look: leastTried.look, reason: `tries photo style ${leastTried.look + 1}, which has the least data` };
}
