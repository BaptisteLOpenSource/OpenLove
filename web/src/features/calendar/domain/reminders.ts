export type SpecialDate = { id: string; label: string; date: string; private_to: string | null };
export type Reminder = SpecialDate & { inDays: number };

const REMIND_BEFORE_DAYS = [0, 7];

const DAY_MS = 86_400_000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m, d);
const daysInMonth = (y: number, m: number) => new Date(utc(y, m + 1, 0)).getUTCDate();
// Feb 29 -> Feb 28 in non-leap years (Date.UTC would roll to Mar 1).
const occurrence = (y: number, m: number, d: number) => utc(y, m, Math.min(d, daysInMonth(y, m)));

// `now` is read in UTC: the cron runs once a day, not per Couple time zone.
export function dueReminders(dates: SpecialDate[], now: Date): Reminder[] {
  const y = now.getUTCFullYear();
  const today = utc(y, now.getUTCMonth(), now.getUTCDate());
  return dates.flatMap((sd) => {
    const [, m = 1, d = 1] = sd.date.split("-").map(Number);
    const next = [occurrence(y, m - 1, d), occurrence(y + 1, m - 1, d)].find((at) => at >= today);
    const inDays = Math.round(((next ?? today) - today) / DAY_MS);
    return REMIND_BEFORE_DAYS.includes(inDays) ? [{ ...sd, inDays }] : [];
  });
}
