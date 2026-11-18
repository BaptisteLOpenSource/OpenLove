import type { MoodValue } from "@/shared/contracts/home";

export type Mood = { mine: MoodValue | null; partner: MoodValue | null };

export function moodOf(rows: { partner_id: string; mood: MoodValue }[], userId: string): Mood {
  return {
    mine: rows.find((r) => r.partner_id === userId)?.mood ?? null,
    partner: rows.find((r) => r.partner_id !== userId)?.mood ?? null,
  };
}
