import { expect, test } from "vitest";

import { roleOf } from "./role";

test.each([
  ["partner_a", { app_metadata: { role: "partner_a" } }, "partner_a"],
  ["partner_b", { app_metadata: { role: "partner_b" } }, "partner_b"],
  ["dev role", { app_metadata: { role: "dev" } }, null],
  ["no app_metadata", { sub: "u1" }, null],
  ["non-string role", { app_metadata: { role: 1 } }, null],
  ["user_metadata only", { user_metadata: { role: "partner_a" } }, null],
  ["no claims", null, null],
])("%s -> %s", (_n, claims, expected) => {
  expect(roleOf(claims as Parameters<typeof roleOf>[0])).toBe(expected);
});
