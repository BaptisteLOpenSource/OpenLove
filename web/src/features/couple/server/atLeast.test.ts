import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { atLeast } from "./atLeast";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("fast run resolves only after the floor", async () => {
  let settled = false;
  const p = atLeast(600, async () => 1).then((v) => ((settled = true), v));
  await vi.advanceTimersByTimeAsync(599);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await p).toBe(1);
});

test("fast failure rejects only after the floor", async () => {
  let settled = false;
  const p = atLeast(600, async () => {
    throw new Error("boom");
  }).catch((e: Error) => ((settled = true), e.message));
  await vi.advanceTimersByTimeAsync(599);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await p).toBe("boom");
});

test("slow run settles at its own end, no extra wait", async () => {
  let settled = false;
  const p = atLeast(600, () => new Promise((r) => setTimeout(() => r(2), 900))).then(
    (v) => ((settled = true), v),
  );
  await vi.advanceTimersByTimeAsync(899);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await p).toBe(2);
});
