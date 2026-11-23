import { beforeEach, expect, test, vi } from "vitest";

import { createInvite, redeemInvite } from "./invite";

const createUser = vi.fn();
const deleteUser = vi.fn();
const rpc = vi.fn();
const signInWithPassword = vi.fn();
const consume = vi.fn();
const hitRateLimit = vi.fn();
const partnerOf = vi.fn();
const insert = vi.fn();
const memberCount = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "app.test", "x-forwarded-for": "1.2.3.4" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("./rateLimit", () => ({ hitRateLimit: (...a: unknown[]) => hitRateLimit(...a) }));
vi.mock("./atLeast", () => ({ atLeast: (_: number, run: () => unknown) => run() }));
vi.mock("@/shared/supabase/server", () => ({
  partnerOf: (...a: unknown[]) => partnerOf(...a),
  serverClient: async () => ({ auth: { signInWithPassword } }),
  adminClient: () => ({
    auth: { admin: { createUser, deleteUser } },
    rpc,
    from: () => ({
      delete: () => ({
        eq: (col: string) =>
          col === "token_hash"
            ? { gt: () => ({ select: () => ({ maybeSingle: consume }) }) }
            : Promise.resolve({ error: null }),
      }),
      insert,
      select: () => ({ eq: () => ({ eq: () => memberCount() }) }),
    }),
  }),
}));

const partnerA = { ok: true, partner: { userId: "u1", coupleId: "c1", role: "partner_a" } };

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const base = { email: "sam@example.com", password: "12345678", ...over };
  for (const [k, v] of Object.entries(base)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  hitRateLimit.mockResolvedValue(true);
  consume.mockResolvedValue({ data: { couple_id: "c1" }, error: null });
  createUser.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
  deleteUser.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: "c1", error: null });
  signInWithPassword.mockResolvedValue({ error: null });
  partnerOf.mockResolvedValue(partnerA);
  memberCount.mockResolvedValue({ count: 0, error: null });
  insert.mockResolvedValue({ error: null });
});

test("valid invite creates partner_b, signs in, redirects", async () => {
  await expect(redeemInvite("tok", {}, form())).rejects.toThrow("redirect:/");
  expect(hitRateLimit).toHaveBeenCalledWith("invite:1.2.3.4", 10, 900);
  expect(createUser).toHaveBeenCalledWith({
    email: "sam@example.com",
    password: "12345678",
    email_confirm: true,
  });
  expect(rpc).toHaveBeenCalledWith("add_partner_b", { p_user_id: "u2", p_couple_id: "c1" });
  expect(signInWithPassword).toHaveBeenCalled();
});

test("consumed or expired invite refused, no account created", async () => {
  consume.mockResolvedValue({ data: null, error: null });
  expect(await redeemInvite("tok", {}, form())).toEqual({ error: "invalid" });
  expect(createUser).not.toHaveBeenCalled();
});

test("rate limited: nothing consumed", async () => {
  hitRateLimit.mockResolvedValue(false);
  expect(await redeemInvite("tok", {}, form())).toEqual({ error: "rate_limited" });
  expect(consume).not.toHaveBeenCalled();
});

test("short password refused before consuming", async () => {
  expect(await redeemInvite("tok", {}, form({ password: "short" }))).toEqual({ error: "invalid" });
  expect(consume).not.toHaveBeenCalled();
});

test("partner_b already exists: auth user deleted, refused", async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  expect(await redeemInvite("tok", {}, form())).toEqual({ error: "invalid" });
  expect(deleteUser).toHaveBeenCalledWith("u2");
});

test("createInvite: partner_a gets link, stored hashed", async () => {
  const r = await createInvite();
  expect(r).toMatchObject({
    url: expect.stringMatching(/^http:\/\/app\.test\/invite\/[\w-]{43}$/),
  });
  const row = insert.mock.calls[0]![0];
  expect(row.couple_id).toBe("c1");
  expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
});

test("createInvite refused for partner_b role or once partner_b exists", async () => {
  partnerOf.mockResolvedValue({
    ok: true,
    partner: { userId: "u2", coupleId: "c1", role: "partner_b" },
  });
  expect(await createInvite()).toEqual({ error: "refused" });
  partnerOf.mockResolvedValue(partnerA);
  memberCount.mockResolvedValue({ count: 1, error: null });
  expect(await createInvite()).toEqual({ error: "refused" });
  expect(insert).not.toHaveBeenCalled();
});
