import { beforeEach, expect, test, vi } from "vitest";

import { GET } from "./route";

const partnerOf = vi.fn();
vi.mock("@/shared/supabase/server", () => ({
  partnerOf: () => partnerOf(),
  serverClient: async () => ({}),
}));
vi.mock("@/features/notifications/server/pushTokens", () => ({
  getPushConfig: () => ({
    projectId: "p",
    apiKey: "k",
    messagingSenderId: "s",
    androidAppId: "a",
  }),
}));

beforeEach(() => partnerOf.mockResolvedValue({ ok: true, partner: { userId: "u" } }));

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
