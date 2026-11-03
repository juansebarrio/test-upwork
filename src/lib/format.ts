/**
 * Date display helpers. The database holds a day (YYYY-MM-DD) and nothing finer.
 * Public pages show even less: month and year only.
 */
import { copy } from '../copy';

/** "September 2026" from "2026-09-29". */
export function monthYear(day: string): string {
  const [y, m] = day.split('-');
  const name = copy.months[Number(m) - 1] ?? m;
  return `${name} ${y}`;
}

/** "29 September 2026" from "2026-09-29". */
export function longDate(day: string): string {
  const [y, m, d] = day.split('-');
  const name = copy.months[Number(m) - 1] ?? m;
  return `${Number(d)} ${name} ${y}`;
}

/** For the moderation panel: "Received today", "Received yesterday" or the full date. */
export function receivedLabel(day: string, today: string): string {
  if (day === today) return copy.admin.receivedToday;
  const t = new Date(today + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() - 1);
  if (day === t.toISOString().slice(0, 10)) return copy.admin.receivedYesterday;
  return `${copy.admin.receivedOn} ${longDate(day)}`;
}
