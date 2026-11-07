// Stage 6: new ads use what has worked. An option is a photo style (lib/ads/prompts.ts) or a caption angle (lib/ads/angles.ts).
// Only sold results count: with too little data the app keeps trying the options it knows least about.

export interface OptionResult<T> {
  productType: string;
  option: T;
  spend: number;
  orders: number;
}

/** Adds up the rows for each option. */
function totals<T>(rows: OptionResult<T>[], options: T[]) {
  return options.map((option) => {
    const mine = rows.filter((r) => r.option === option);
    return { option, spend: mine.reduce((sum, r) => sum + r.spend, 0), orders: mine.reduce((sum, r) => sum + r.orders, 0) };
  });
}

/** The option with the lowest cost per sale within the limit, for this type of product if it has sold, otherwise for any product. */
export function chooseOption<T>(results: OptionResult<T>[], productType: string, maxCostPerSale: number, options: T[], name: (option: T) => string): { option: T; reason: string } {
  const proven = (rows: OptionResult<T>[]) =>
    totals(rows, options)
      .filter((t) => t.orders > 0 && t.spend / t.orders <= maxCostPerSale)
      .sort((a, b) => a.spend / a.orders - b.spend / b.orders)[0];

  const sameType = proven(results.filter((r) => r.productType === productType));
  if (sameType) return { option: sameType.option, reason: `uses ${name(sameType.option)}, the best seller for this type of product` };
  const anyType = proven(results);
  if (anyType) return { option: anyType.option, reason: `uses ${name(anyType.option)}, the best seller so far` };

  const leastTried = totals(results, options).sort((a, b) => a.spend - b.spend)[0];
  return { option: leastTried.option, reason: `tries ${name(leastTried.option)}, which has the least data` };
}
