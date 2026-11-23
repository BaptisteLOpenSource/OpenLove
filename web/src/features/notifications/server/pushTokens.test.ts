// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { getPushConfig, registerPushToken } from "./pushTokens";

vi.mock("server-only", () => ({}));

let insertError: { code: string } | null = null;
let owner: string | null = null;
const inserted: unknown[] = [];
vi.mock("@/shared/supabase/server", () => ({
  adminClient: () => ({
    from: () => ({
      insert: async (row: unknown) => {
        inserted.push(row);
        return { error: insertError };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: owner ? { user_id: owner } : null, error: null }),
        }),
      }),
    }),
  }),
  partnerOf: vi.fn(),
  serverClient: vi.fn(),
}));
vi.mock("@/shared/env", () => ({
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
});

test("new token is stored for the caller", async () => {
  expect(await registerPushToken("u1", { token: "t", platform: "web" })).toEqual({
    registered: true,
  });
  expect(inserted).toEqual([{ user_id: "u1", token: "t", platform: "web" }]);
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

test("push config maps env to the contract", () => {
  expect(getPushConfig()).toEqual({
    projectId: "p",
    apiKey: "k",
    messagingSenderId: "s",
    androidAppId: "a",
  });
});
