import { beforeEach, expect, test, vi } from "vitest";

import { POST } from "./route";

const partnerOf = vi.fn();
const register = vi.fn();

vi.mock("@/shared/supabase/server", () => ({
  partnerOf: () => partnerOf(),
  serverClient: async () => ({}),
}));
vi.mock("@/features/notifications/server/pushTokens", () => ({
  registerPushToken: (...a: unknown[]) => register(...a),
}));

const post = (body: unknown) =>
  POST(
    new Request("http://x/api/push-tokens", {
      method: "POST",
      headers: { origin: "http://x", host: "x" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  partnerOf.mockResolvedValue({ ok: true, partner: { userId: "u", coupleId: "c" } });
  register.mockResolvedValue({ registered: true });
});

test("no session -> 401", async () => {
  partnerOf.mockResolvedValue({ ok: false, code: "unauthorized" });
  expect((await post({ token: "t", platform: "web" })).status).toBe(401);
});

test("bad input -> 400, never stored", async () => {
  expect((await post({ token: "", platform: "web" })).status).toBe(400);
  expect((await post({ token: "t", platform: "ios" })).status).toBe(400);
  expect((await post({ token: "x".repeat(4097), platform: "web" })).status).toBe(400);
  expect(register).not.toHaveBeenCalled();
});

test("valid -> registers for the caller", async () => {
  const res = await post({ token: "t", platform: "android" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ data: { registered: true } });
  expect(register).toHaveBeenCalledWith("u", { token: "t", platform: "android" });
});
