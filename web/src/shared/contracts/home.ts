import { z } from "zod";

const milestone = z.strictObject({
  years: z.int().nonnegative(),
  months: z.int().nonnegative(),
  days: z.int().nonnegative(),
  totalDays: z.int().nonnegative(),
});

const upcomingDate = z.strictObject({
  label: z.string().min(1),
  date: z.iso.date(),
  inDays: z.int().min(0).max(30),
});

export const moodValue = z.enum(["happy", "calm", "tired", "sad", "anxious"]);
export type MoodValue = z.infer<typeof moodValue>;

const mood = z.strictObject({
  mine: moodValue.nullable(),
  partner: moodValue.nullable(),
});

const moodDay = mood.extend({ day: z.iso.date() });

export const homeResponse = z.strictObject({
  milestone,
  upcomingDate: upcomingDate.nullable(),
  // Humeur of today (Couple time zone): own and the other Partenaire's, null = not set
  mood,
  // days before today, newest first, same window for both Partenaires
  moodHistory: z.array(moodDay).max(6),
});

export const setMoodInput = z.strictObject({ mood: moodValue });

const home = {
  milestone: { years: 1, months: 2, days: 3, totalDays: 430 },
  upcomingDate: { label: "Anniversaire", date: "2026-11-05", inDays: 6 },
  mood: { mine: "happy", partner: "calm" },
  moodHistory: [{ day: "2026-10-29", mine: "tired", partner: null }],
};

export const examples = {
  valid: [
    home,
    {
      milestone: { years: 0, months: 0, days: 0, totalDays: 0 },
      upcomingDate: null,
      mood: { mine: null, partner: null },
      moodHistory: [],
    },
  ],
  invalid: [
    { milestone: { years: 0, months: 0, days: 0, totalDays: 0 }, upcomingDate: null },
    { ...home, upcomingDate: { ...home.upcomingDate, inDays: 31 } },
    { ...home, upcomingDate: { ...home.upcomingDate, date: "05/11/2026" } },
    { ...home, milestone: { ...home.milestone, totalDays: -1 } },
    { ...home, mood: { mine: "angry", partner: null } },
    { ...home, mood: { mine: "happy" } },
    { ...home, moodHistory: [{ day: "29/10/2026", mine: null, partner: null }] },
  ],
};
