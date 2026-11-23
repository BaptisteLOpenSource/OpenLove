import { beforeEach, expect, test, vi } from "vitest";

import { GET } from "./route";

const partnerOf = vi.fn();
vi.mock("@/shared/supabase/server", () => ({
  partnerOf: () => partnerOf(),
  serverClient: async () => ({}),
}));
let unconfigured = false;
vi.mock("@/features/notifications/server/pushTokens", async () => {
  const { ApiError } = await import("@/shared/http/withContract");
  return {
    getPushConfig: () => {
      if (unconfigured) throw new ApiError(404, "not_found", "push not configured");
      return { projectId: "p", apiKey: "k", messagingSenderId: "s", androidAppId: "a" };
    },
  };
});

beforeEach(() => {
  unconfigured = false;
  partnerOf.mockResolvedValue({ ok: true, partner: { userId: "u" } });
});

test("Firebase not configured -> 404 not_found", async () => {
  unconfigured = true;
  const res = await GET(new Request("http://x/api/push-config"));
  expect(res.status).toBe(404);
  expect((await res.json()).error.code).toBe("not_found");
});

test("no session -> 401", async () => {
  partnerOf.mockResolvedValue({ ok: false, code: "unauthorized" });
  expect((await GET(new Request("http://x/api/push-config"))).status).toBe(401);
});

test("partner -> 200 with the four config strings", async () => {
  const res = await GET(new Request("http://x/api/push-config"));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    data: { projectId: "p", apiKey: "k", messagingSenderId: "s", androidAppId: "a" },
  });
});
