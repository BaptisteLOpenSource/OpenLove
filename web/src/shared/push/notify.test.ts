// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { notify } from "./notify";

vi.mock("server-only", () => ({}));

const deleted: string[] = [];
let tokens: string[] = [];
let platform = "web";
let dbError: unknown = null;
let accountB64 = "";
let configured = true;
vi.mock("@/shared/env", () => ({
  env: () => ({ FIREBASE_SERVICE_ACCOUNT: accountB64 }),
  firebaseConfigured: () => configured,
}));
vi.mock("@/shared/supabase/server", () => ({
  adminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: dbError ? null : tokens.map((token) => ({ token, platform })),
          error: dbError,
        }),
      }),
      delete: () => ({
        eq: async (_c: string, token: string) => {
          deleted.push(token);
          return { error: null };
        },
      }),
    }),
  }),
}));

const payload = { title: "T", body: "B", url: "/messages", tag: "chat" };
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account = {
  project_id: "proj",
  client_email: "sa@proj.iam",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

type FcmCall = { token: string; message: Record<string, unknown> };
let fcm: FcmCall[] = [];
let oauthCalls = 0;
// per-attempt FCM answers, consumed in order; empty = 200
let answers: (Response | Error)[] = [];
let clock = Date.now();
const fcmError = (status: number, errorStatus: string, errorCode?: string, message = "m") =>
  new Response(
    JSON.stringify({
      error: { status: errorStatus, message, details: errorCode ? [{ errorCode }] : [] },
    }),
    { status },
  );

beforeEach(() => {
  vi.useFakeTimers();
  // the access token cache is module state: jump past its expiry each test
  clock += 2 * 3600_000;
  vi.setSystemTime(clock);
  accountB64 = Buffer.from(JSON.stringify(account)).toString("base64");
  vi.spyOn(console, "error").mockImplementation(() => {});
  deleted.length = 0;
  tokens = ["t1"];
  platform = "web";
  configured = true;
  dbError = null;
  fcm = [];
  oauthCalls = 0;
  answers = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url === "https://oauth2.googleapis.com/token") {
        oauthCalls++;
        return Response.json({ access_token: "at", expires_in: 3600 });
      }
      expect(url).toBe("https://fcm.googleapis.com/v1/projects/proj/messages:send");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer at");
      const { message } = JSON.parse(init.body as string);
      fcm.push({ token: message.token, message });
      const next = answers.shift();
      if (next instanceof Error) throw next;
      return next ?? Response.json({ name: "ok" });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const run = async () => {
  const p = notify("u1", payload);
  await vi.runAllTimersAsync();
  await p;
};

test("sends the exact FCM message to every token of the user", async () => {
  tokens = ["t1", "t2"];
  await run();
  expect(fcm.map((c) => c.token)).toEqual(["t1", "t2"]);
  expect(fcm[0]?.message).toEqual({
    token: "t1",
    notification: { title: "T", body: "B" },
    data: { url: "/messages", tag: "chat" },
    webpush: { notification: { tag: "chat" } },
  });
});

test("android token gets a data-only message", async () => {
  platform = "android";
  await run();
  expect(fcm[0]?.message).toEqual({
    token: "t1",
    data: { url: "/messages", tag: "chat", title: "T", body: "B" },
    android: { priority: "HIGH", collapse_key: "chat" },
  });
});

test("Firebase not configured -> no-op, no fetch, no throw", async () => {
  configured = false;
  await run();
  expect(fetch).not.toHaveBeenCalled();
});

test("access token is cached between sends", async () => {
  await run();
  await run();
  expect(oauthCalls).toBe(1);
});

test("503 then INTERNAL then ok: 3 attempts, token kept", async () => {
  answers = [fcmError(503, "UNAVAILABLE"), fcmError(500, "INTERNAL", "internal-error")];
  await run();
  expect(fcm).toHaveLength(3);
  expect(deleted).toEqual([]);
});

test("network error then 429 then ok: 3 attempts", async () => {
  answers = [new Error("net"), fcmError(429, "RESOURCE_EXHAUSTED")];
  await run();
  expect(fcm).toHaveLength(3);
});

test("transient forever: 1 try + 2 retries, then gives up, token kept", async () => {
  answers = [
    fcmError(503, "UNAVAILABLE"),
    fcmError(503, "UNAVAILABLE"),
    fcmError(503, "UNAVAILABLE"),
    fcmError(503, "UNAVAILABLE"),
  ];
  await run();
  expect(fcm).toHaveLength(3);
  expect(deleted).toEqual([]);
});

test.each([
  fcmError(404, "NOT_FOUND", "UNREGISTERED"),
  fcmError(410, "GONE"),
  fcmError(400, "INVALID_ARGUMENT", undefined, "The registration token is not a valid FCM token"),
])("permanent token error -> row deleted, no retry", async (res) => {
  answers = [res];
  await run();
  expect(fcm).toHaveLength(1);
  expect(deleted).toEqual(["t1"]);
});

test("other 4xx: no retry, token kept", async () => {
  answers = [fcmError(400, "INVALID_ARGUMENT", undefined, "bad payload")];
  await run();
  expect(fcm).toHaveLength(1);
  expect(deleted).toEqual([]);
});

test("never throws: db error, bad service account, oauth failure", async () => {
  dbError = new Error("db");
  await expect(run()).resolves.toBeUndefined();
  dbError = null;
  accountB64 = "!!";
  await expect(run()).resolves.toBeUndefined();
  accountB64 = Buffer.from(JSON.stringify(account)).toString("base64");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("no", { status: 401 })),
  );
  await expect(run()).resolves.toBeUndefined();
  expect(fcm).toHaveLength(0);
});
