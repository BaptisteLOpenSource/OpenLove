import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test, vi } from "vitest";

import { getHome, getPartnerNames, setMood } from "./getHome";

const couple = vi.fn(async () => ({
  data: { start_date: "2020-02-14", time_zone: "Europe/Paris" },
  error: null,
}));
const dates = vi.fn(async () => ({
  data: [{ label: "Anniversaire", date: "2019-10-25" }],
  error: null,
}));
const moods = vi.fn(async () => ({
  data: [
    { partner_id: "u1", mood: "happy" },
    { partner_id: "u2", mood: "calm" },
  ],
  error: null,
}));
const upsert = vi.fn(async () => ({ error: null }));
const from = vi.fn((table: string) => {
  if (table === "couples") return { select: () => ({ eq: () => ({ single: couple }) }) };
  if (table === "moods") return { select: () => ({ eq: () => ({ eq: moods }) }), upsert };
  return { select: () => ({ eq: dates }) };
});
const sb = { from } as unknown as SupabaseClient;

test("reads Couple, special dates and today's moods, counts in the Couple time zone", async () => {
  const home = await getHome(sb, "c1", "u1", new Date("2026-10-18T22:30:00Z"));
  expect(from).toHaveBeenCalledWith("couples");
  expect(from).toHaveBeenCalledWith("special_dates");
  expect(home.milestone.totalDays).toBe(2439);
  expect(home.upcomingDate).toEqual({
    label: "Anniversaire",
    date: "2026-10-25",
    inDays: 6,
  });
  expect(home.mood).toEqual({ mine: "happy", partner: "calm" });
});

test("special_dates error -> rejects", async () => {
  dates.mockResolvedValueOnce({
    data: null,
    error: new Error("db down"),
  } as never);
  await expect(getHome(sb, "c1", "u1")).rejects.toThrow("db down");
});

test("setMood upserts today's row, keyed on (partner, day) so a second set replaces the first", async () => {
  await setMood(sb, { userId: "u1", coupleId: "c1" }, "sad", new Date("2026-10-18T22:30:00Z"));
  expect(upsert).toHaveBeenCalledWith(
    { couple_id: "c1", partner_id: "u1", day: "2026-10-19", mood: "sad" },
    { onConflict: "partner_id,day" },
  );
});

test("getPartnerNames reads names from the Couple", async () => {
  couple.mockResolvedValueOnce({
    data: { partner_a_name: "Alex", partner_b_name: "Sam" },
    error: null,
  } as never);
  await expect(getPartnerNames(sb, "c1")).resolves.toEqual({
    a: "Alex",
    b: "Sam",
  });
});

test("getPartnerNames error -> rejects", async () => {
  couple.mockResolvedValueOnce({
    data: null,
    error: new Error("db down"),
  } as never);
  await expect(getPartnerNames(sb, "c1")).rejects.toThrow("db down");
});
