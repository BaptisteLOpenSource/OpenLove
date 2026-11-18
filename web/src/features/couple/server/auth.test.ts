import { beforeEach, expect, test, vi } from "vitest";

import { LOGIN_FLOOR_MS } from "../domain/limits";
import { signIn, signOut } from "./auth";
import { hitRateLimit } from "./rateLimit";

const signInWithPassword = vi.fn();
const authSignOut = vi.fn();
const sb = { auth: { signInWithPassword, signOut: authSignOut } };
const partnerOf = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`);
});

vi.mock("@/shared/supabase/server", () => ({
  serverClient: async () => sb,
  partnerOf: (...a: unknown[]) => partnerOf(...a),
}));
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "9.9.9.9" }),
}));
vi.mock("./rateLimit", () => ({ hitRateLimit: vi.fn() }));

const form = (email: string, password = "pw") => {
  const f = new FormData();
  f.set("email", email);
  f.set("password", password);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hitRateLimit).mockResolvedValue(true);
  signInWithPassword.mockResolvedValue({
    data: { user: { app_metadata: { role: "partner_a" } } },
    error: null,
  });
});

test("bad email -> invalid, no Supabase call", async () => {
  expect(await signIn({}, form("nope"))).toEqual({ error: "invalid" });
  expect(signInWithPassword).not.toHaveBeenCalled();
});

test("rate limited -> rate_limited, no Supabase call", async () => {
  vi.mocked(hitRateLimit).mockResolvedValue(false);
  expect(await signIn({}, form("a@example.com"))).toEqual({ error: "rate_limited" });
  expect(hitRateLimit).toHaveBeenCalledWith("login:9.9.9.9", 10, 900);
  expect(signInWithPassword).not.toHaveBeenCalled();
});

test("auth error -> invalid", async () => {
  signInWithPassword.mockResolvedValue({ error: new Error("bad creds") });
  expect(await signIn({}, form("a@example.com"))).toEqual({ error: "invalid" });
  expect(partnerOf).not.toHaveBeenCalled();
});

test("no role claim -> invalid (same as bad password), signed out", async () => {
  signInWithPassword.mockResolvedValue({ data: { user: { app_metadata: {} } }, error: null });
  expect(await signIn({}, form("a@example.com"))).toEqual({ error: "invalid" });
  expect(authSignOut).toHaveBeenCalled();
});

test("failure answers only after the floor", async () => {
  signInWithPassword.mockResolvedValue({ error: new Error("bad creds") });
  const started = Date.now();
  await signIn({}, form("a@example.com"));
  expect(Date.now() - started).toBeGreaterThanOrEqual(LOGIN_FLOOR_MS - 10);
});

test("member -> redirect to /", async () => {
  await expect(signIn({}, form("a@example.com"))).rejects.toThrow("redirect:/");
  expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@example.com", password: "pw" });
  expect(authSignOut).not.toHaveBeenCalled();
});

test("signOut -> supabase signOut then redirect to /login", async () => {
  await expect(signOut()).rejects.toThrow("redirect:/login");
  expect(authSignOut).toHaveBeenCalled();
});
