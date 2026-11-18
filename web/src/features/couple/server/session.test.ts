import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiError } from "@/shared/http/withContract";

import { LOGIN_FLOOR_MS } from "../domain/limits";
import { hitRateLimit } from "./rateLimit";
import { refreshSession, signInForSession } from "./session";

const refresh = vi.fn();
const signInWithPassword = vi.fn();
const adminSignOut = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/shared/supabase/server", () => ({
  anonClient: () => ({ auth: { refreshSession: refresh, signInWithPassword } }),
  adminClient: () => ({ auth: { admin: { signOut: adminSignOut } } }),
}));
vi.mock("./rateLimit", () => ({ hitRateLimit: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hitRateLimit).mockResolvedValue(true);
});

const signIn = () =>
  signInForSession(
    { email: "a@example.com", password: "pw" },
    { req: new Request("http://localhost/api/session", { method: "POST" }) },
  );
const apiErr = (p: Promise<unknown>) => p.catch((e: unknown) => e);

test("no role claim -> 401 invalid credentials, token revoked", async () => {
  signInWithPassword.mockResolvedValue({
    data: { user: { app_metadata: {} }, session: { access_token: "t" } },
    error: null,
  });
  await expect(signIn()).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  expect(adminSignOut).toHaveBeenCalledWith("t");
});

test("bad credentials -> same 401 body as missing role", async () => {
  signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error("x") });
  await expect(signIn()).rejects.toMatchObject({
    status: 401,
    code: "unauthorized",
    message: "invalid credentials",
  });
});

test("failure takes at least the login floor", async () => {
  signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error("x") });
  const started = Date.now();
  await apiErr(signIn());
  expect(Date.now() - started).toBeGreaterThanOrEqual(LOGIN_FLOOR_MS - 10);
});

const fail = (error: unknown) => refresh.mockResolvedValue({ data: { session: null }, error });
const apiError = (status: number) => new AuthApiError("x", status, "code");

test("refused refresh token (4xx) -> 401", async () => {
  fail(apiError(400));
  await expect(refreshSession({ refreshToken: "r" })).rejects.toMatchObject({ status: 401 });
});

test("GoTrue 429 -> rate_limited", async () => {
  fail(apiError(429));
  await expect(refreshSession({ refreshToken: "r" })).rejects.toMatchObject({
    status: 429,
    code: "rate_limited",
  });
});

test("GoTrue 5xx -> rethrown, never 401", async () => {
  const e = apiError(503);
  fail(e);
  await expect(refreshSession({ refreshToken: "r" })).rejects.toBe(e);
});

test("network failure -> rethrown, never 401", async () => {
  const e = new AuthRetryableFetchError("down", 0);
  fail(e);
  const err = await refreshSession({ refreshToken: "r" }).catch((x: unknown) => x);
  expect(err).toBe(e);
  expect(err).not.toBeInstanceOf(ApiError);
});
