import { expect, test } from "vitest";

import { isDismissed } from "./MoodBanner";

const H = 3_600_000;

test("dismiss hides 48 h, then the banner comes back", () => {
  const now = 1_000 * H;
  expect(isDismissed(null, now)).toBe(false);
  expect(isDismissed("garbage", now)).toBe(false);
  expect(isDismissed(String(now - 47 * H), now)).toBe(true);
  expect(isDismissed(String(now - 49 * H), now)).toBe(false);
});
