import { expect, test } from "vitest";

import { daysBefore, HISTORY_DAYS, moods } from "./mood";

test("daysBefore crosses month and year ends", () => {
  expect(daysBefore("2026-03-01", 1)).toBe("2026-02-28");
  expect(daysBefore("2026-01-01", 1)).toBe("2025-12-31");
});

test("today split from history; both Partenaires on the same days, gaps null", () => {
  const rows = [
    { partner_id: "me", mood: "happy" as const, day: "2026-11-18" },
    { partner_id: "p", mood: "tired" as const, day: "2026-11-17" },
    { partner_id: "me", mood: "sad" as const, day: "2026-11-17" },
    { partner_id: "p", mood: "calm" as const, day: "2026-11-12" },
  ];
  const { mood, moodHistory } = moods(rows, "me", "2026-11-18");
  expect(mood).toEqual({ mine: "happy", partner: null });
  expect(moodHistory).toHaveLength(HISTORY_DAYS);
  expect(moodHistory[0]).toEqual({ day: "2026-11-17", mine: "sad", partner: "tired" });
  expect(moodHistory[1]).toEqual({ day: "2026-11-16", mine: null, partner: null });
  expect(moodHistory[5]).toEqual({ day: "2026-11-12", mine: null, partner: "calm" });
});
