import { expect, test } from "vitest";

import { dueReminders } from "./reminders";

const d = (date: string, label = "L", private_to: string | null = null) => ({
  id: label,
  label,
  date,
  private_to,
});
const due = (today: string, dates: ReturnType<typeof d>[]) =>
  dueReminders(dates, new Date(`${today}T08:00:00Z`)).map((r) => [r.label, r.inDays]);

test("due on the day itself, 7 days before, recurring every year", () => {
  const dates = [d("2019-10-25", "A")];
  expect(due("2026-10-25", dates)).toEqual([["A", 0]]);
  expect(due("2026-10-18", dates)).toEqual([["A", 7]]);
  expect(due("2026-10-20", dates)).toEqual([]);
  expect(due("2026-10-26", dates)).toEqual([]);
});

test("year wrap: Jan 3 is 7 days after Dec 27, seen from Dec 27", () => {
  expect(due("2026-12-27", [d("2020-01-03", "W")])).toEqual([["W", 7]]);
});

test("Feb 29 falls on Feb 28 in a non-leap year, Feb 29 in a leap year", () => {
  const dates = [d("2020-02-29", "B")];
  expect(due("2026-02-28", dates)).toEqual([["B", 0]]);
  expect(due("2026-02-21", dates)).toEqual([["B", 7]]);
  expect(due("2028-02-29", dates)).toEqual([["B", 0]]);
  expect(due("2028-02-28", dates)).toEqual([]);
});
