import { INTL_LOCALE, type Locale } from './i18n-shared';

/** Business timezone: Timor-Leste (UTC+9, no DST). Every date shown or bucketed by day uses this zone. */
export const TZ = 'Asia/Dili';

const toDate = (d: Date | string | number) => (d instanceof Date ? d : new Date(d));

export function formatDateTime(d: Date | string | number | null | undefined, locale: Locale = 'en'): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(toDate(d));
}
export function formatDate(d: Date | string | number | null | undefined, locale: Locale = 'en'): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TZ, dateStyle: 'medium' }).format(toDate(d));
}
/** 'YYYY-MM-DD' for the Dili calendar day containing the instant. */
export function diliDay(d: Date | string | number = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(toDate(d));
}
/** UTC instant of 00:00 Dili time for a 'YYYY-MM-DD' day (Dili is a fixed UTC+9). */
export function diliDayStart(day: string): Date {
  return new Date(`${day}T00:00:00+09:00`);
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return diliDay(d);
}
/** <input type="datetime-local"> value (Dili wall clock) -> UTC Date */
export function parseDiliLocal(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+09:00`);
  return isNaN(+d) ? null : d;
}
export function toDiliLocalInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(toDate(d)).replace(' ', 'T');
}
