// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { FIREBASE_ENV } from "../test/firebaseEnv";
import { PUBLIC_API, proxy } from "./proxy";

type SetAll = (
  c: { name: string; value: string; options: object }[],
  h: Record<string, string>,
) => void;
let claims: object | null = null;
let refresh: ((setAll: SetAll) => void) | undefined;
let claimsCalls: (string | undefined)[] = [];

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_u: string, _k: string, o: { cookies: { setAll: SetAll } }) => ({
    auth: {
      getClaims: async (jwt?: string) => {
        claimsCalls.push(jwt);
        refresh?.(o.cookies.setAll);
        return { data: claims && { claims }, error: null };
      },
    },
  }),
}));

const PARTNER_A = { sub: "u1", app_metadata: { role: "partner_a" } };

beforeEach(() => {
  claims = null;
  refresh = undefined;
  claimsCalls = [];
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_ANON_KEY", "a");
  vi.stubEnv("MESSAGE_ENCRYPTION_KEY", Buffer.alloc(32).toString("base64"));
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "b");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a");
  vi.stubEnv("SETUP_TOKEN", "x".repeat(32));
  for (const [k, v] of Object.entries(FIREBASE_ENV)) vi.stubEnv(k, v);
});

const at = (path: string, headers?: Record<string, string>) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers }));
const bearer = { authorization: "Bearer tok" };
const unauthorized = async (res: Response) => {
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "unauthorized" } });
};

test("no session on / -> 307 to /login", async () => {
  const res = await at("/");
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost/login");
});

test.each(["/login", "/setup"])("no session on %s -> passes", async (path) => {
  const res = await at(path);
  expect(res.headers.get("location")).toBeNull();
  expect(res.headers.get("x-middleware-next")).toBe("1");
});

test("session without role on / -> 307 to /login (pre-migration session)", async () => {
  claims = { sub: "u1" };
  const res = await at("/");
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost/login");
});

test("session with role on / -> passes", async () => {
  claims = PARTNER_A;
  const res = await at("/");
  expect(res.headers.get("x-middleware-next")).toBe("1");
});

test("refreshed session -> cookies and no-store headers on the response", async () => {
  claims = PARTNER_A;
  refresh = (setAll) =>
    setAll([{ name: "sb-auth", value: "new", options: { path: "/" } }], {
      "Cache-Control": "private, no-store",
    });
  const res = await at("/");
  expect((res as NextResponse).cookies.get("sb-auth")?.value).toBe("new");
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  expect(res.headers.get("x-middleware-request-cookie")).toContain("sb-auth=new");
});

test("/setup with no env -> passes without building the client", async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.resetModules();
  const { proxy: fresh } = await import("./proxy");
  const res = await fresh(new NextRequest("http://localhost/setup"));
  expect(res.headers.get("x-middleware-next")).toBe("1");
});

test("API without bearer and without session -> 401 envelope", async () => {
  await unauthorized(await at("/api/home"));
  expect(claimsCalls).toEqual([undefined]);
});

test("API cookie session with role -> passes (web UI)", async () => {
  claims = PARTNER_A;
  const res = await at("/api/home");
  expect(res.headers.get("x-middleware-next")).toBe("1");
  expect(claimsCalls).toEqual([undefined]);
});

test("API bearer without role claim -> 401, token checked", async () => {
  claims = { sub: "u1", app_metadata: {} };
  await unauthorized(await at("/api/home", bearer));
  expect(claimsCalls).toEqual(["tok"]);
});

test("API bearer with only user_metadata.role -> 401", async () => {
  claims = { sub: "u1", user_metadata: { role: "partner_a" } };
  await unauthorized(await at("/api/home", bearer));
});

test("API bearer with app_metadata.role partner_b -> passes", async () => {
  claims = { sub: "u1", app_metadata: { role: "partner_b" } };
  const res = await at("/api/home", bearer);
  expect(res.headers.get("x-middleware-next")).toBe("1");
});

test.each(PUBLIC_API)("public API %s passes with no token, no claim check", async (path) => {
  const res = await at(path);
  expect(res.headers.get("x-middleware-next")).toBe("1");
  expect(claimsCalls).toEqual([]);
});

test('every auth:"public" route is in the proxy public list', () => {
  const root = join(process.cwd(), "src/app/api");
  const publicRoutes = (readdirSync(root, { recursive: true }) as string[])
    .filter((f) => f.endsWith("route.ts"))
    .filter((f) => readFileSync(join(root, f), "utf8").includes('auth: "public"'))
    .map((f) => `/api/${dirname(f)}`.replace(/\/\.$/, ""));
  expect(publicRoutes.length).toBeGreaterThan(0);
  for (const path of publicRoutes) expect(PUBLIC_API).toContain(path);
});
