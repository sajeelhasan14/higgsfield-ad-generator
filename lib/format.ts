/** "45" + "GBP" → "£45.00". Used by the dashboard now and by the ad templates later. */
export function formatPrice(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(amount));
}
