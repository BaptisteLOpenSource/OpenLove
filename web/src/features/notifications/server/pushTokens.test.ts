// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { getPushConfig, registerPushToken } from "./pushTokens";

vi.mock("server-only", () => ({}));

let insertError: { code: string } | null = null;
let owner: string | null = null;
const inserted: unknown[] = [];
let userTokens: string[] = [];
const deleted: string[][] = [];
vi.mock("@/shared/supabase/server", () => ({
  adminClient: () => ({
    from: () => ({
      insert: async (row: unknown) => {
        inserted.push(row);
        return { error: insertError };
      },
      delete: () => ({
        in: async (_c: string, tokens: string[]) => {
          deleted.push(tokens);
          return { error: null };
        },
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            range: async (from: number) => ({
              data: userTokens.slice(from).map((token) => ({ token })),
              error: null,
            }),
          }),
          maybeSingle: async () => ({ data: owner ? { user_id: owner } : null, error: null }),
        }),
      }),
    }),
  }),
  partnerOf: vi.fn(),
  serverClient: vi.fn(),
}));
let configured = true;
vi.mock("@/shared/env", () => ({
  firebaseConfigured: () => configured,
  env: () => ({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "p",
    NEXT_PUBLIC_FIREBASE_API_KEY: "k",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "s",
    FIREBASE_ANDROID_APP_ID: "a",
  }),
}));

beforeEach(() => {
  insertError = null;
  owner = null;
  inserted.length = 0;
  userTokens = [];
  deleted.length = 0;
  configured = true;
});

test("new token is stored for the caller", async () => {
  expect(await registerPushToken("u1", { token: "t", platform: "web" })).toEqual({
    registered: true,
  });
  expect(inserted).toEqual([{ user_id: "u1", token: "t", platform: "web" }]);
});

test("11th token -> oldest deleted, newest 10 stay", async () => {
  userTokens = Array.from({ length: 12 }, (_, i) => `t${i}`);
  await registerPushToken("u1", { token: "t0", platform: "web" });
  expect(deleted).toEqual([["t10", "t11"]]);
});

test("10 tokens or fewer -> nothing deleted", async () => {
  userTokens = Array.from({ length: 10 }, (_, i) => `t${i}`);
  await registerPushToken("u1", { token: "t0", platform: "web" });
  expect(deleted).toEqual([]);
});

test("same token again by its owner -> registered", async () => {
  insertError = { code: "23505" };
  owner = "u1";
  expect(await registerPushToken("u1", { token: "t", platform: "web" })).toEqual({
    registered: true,
  });
});

test("token owned by the other Partenaire -> 403 forbidden", async () => {
  insertError = { code: "23505" };
  owner = "u2";
  await expect(registerPushToken("u1", { token: "t", platform: "android" })).rejects.toMatchObject({
    status: 403,
    code: "forbidden",
  });
});

test("other db error propagates", async () => {
  insertError = { code: "XX000" };
  await expect(registerPushToken("u1", { token: "t", platform: "web" })).rejects.toBeDefined();
});

test("push config without Firebase -> 404 not_found", () => {
  configured = false;
  expect(() => getPushConfig()).toThrow(
    expect.objectContaining({ status: 404, code: "not_found" }),
  );
});

test("push config maps env to the contract", () => {
  expect(getPushConfig()).toEqual({
    projectId: "p",
    apiKey: "k",
    messagingSenderId: "s",
    androidAppId: "a",
  });
});
