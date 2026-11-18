import { beforeEach, expect, test, vi } from "vitest";

import { POST } from "./route";

const partnerOf = vi.fn();
const markRead = vi.fn();

vi.mock("@/shared/supabase/server", () => ({
  partnerOf: () => partnerOf(),
  serverClient: async () => ({}),
}));
vi.mock("@/features/messages/server/messages", () => ({
  markRead: (...a: unknown[]) => markRead(...a),
}));

const partner = { userId: "u", coupleId: "c", role: "partner_a" };
const post = () =>
  POST(
    new Request("http://x/api/messages/read", {
      method: "POST",
      headers: { origin: "http://x", host: "x" },
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  partnerOf.mockResolvedValue({ ok: true, partner });
  markRead.mockResolvedValue({ lastReadId: "42" });
});

test("POST without session -> 401", async () => {
  partnerOf.mockResolvedValue({ ok: false, code: "unauthorized" });
  expect((await post()).status).toBe(401);
  expect(markRead).not.toHaveBeenCalled();
});

test("POST marks read as the caller and returns lastReadId", async () => {
  const res = await post();
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual({ lastReadId: "42" });
  expect(markRead).toHaveBeenCalledWith({});
});
