import { POSTING_TIMEZONE } from './config';

/** "Sat 25 Oct, 18:00" in the posting timezone, so the dashboard shows the same times as the slots. */
export function formatSlotTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: POSTING_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "45" + "GBP" → "£45.00". Used by the dashboard now and by the ad templates later. */
export function formatPrice(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(amount));
}
