import type { MoodValue } from "@/shared/contracts/home";

// History window: the days before today, same window for both Partenaires.
export const HISTORY_DAYS = 6;

export type Mood = { mine: MoodValue | null; partner: MoodValue | null };
export type MoodDay = Mood & { day: string };
type Row = { partner_id: string; mood: MoodValue; day: string };

export function daysBefore(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function moodOn(rows: Row[], day: string, userId: string): Mood {
  const ofDay = rows.filter((r) => r.day === day);
  return {
    mine: ofDay.find((r) => r.partner_id === userId)?.mood ?? null,
    partner: ofDay.find((r) => r.partner_id !== userId)?.mood ?? null,
  };
}

export function moods(
  rows: Row[],
  userId: string,
  today: string,
): { mood: Mood; moodHistory: MoodDay[] } {
  return {
    mood: moodOn(rows, today, userId),
    moodHistory: Array.from({ length: HISTORY_DAYS }, (_, i) => {
      const day = daysBefore(today, i + 1);
      return { day, ...moodOn(rows, day, userId) };
    }),
  };
}
