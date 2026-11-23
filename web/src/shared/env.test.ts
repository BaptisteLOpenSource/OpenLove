import { afterEach, expect, test, vi } from "vitest";

import { FIREBASE_ENV } from "../../test/firebaseEnv";

const base = {
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  MESSAGE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  SETUP_TOKEN: "x".repeat(32),
  CRON_SECRET: "s3cret-s3cret-s3cret",
};

async function load(extra: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries({ ...base, ...extra })) vi.stubEnv(k, v);
  return import("./env");
}
afterEach(() => vi.unstubAllEnvs());

test("no Firebase var -> valid, not configured", async () => {
  const m = await load({});
  expect(m.firebaseConfigured()).toBe(false);
});

test("all Firebase vars -> configured", async () => {
  const m = await load(FIREBASE_ENV);
  expect(m.firebaseConfigured()).toBe(true);
});

test("partial Firebase set -> env() throws", async () => {
  const m = await load({ NEXT_PUBLIC_FIREBASE_API_KEY: "k" });
  expect(() => m.env()).toThrow();
});

test("CRON_SECRET optional, too short -> env() throws", async () => {
  expect((await load({ CRON_SECRET: undefined })).env().CRON_SECRET).toBeUndefined();
  const short = await load({ CRON_SECRET: "short" });
  expect(() => short.env()).toThrow();
});
