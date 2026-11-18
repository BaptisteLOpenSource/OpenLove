import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { localAdmin, SEED, seed } from "../scripts/seed";
import fr from "../src/shared/i18n/messages/fr.json" with { type: "json" };

const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";

test.beforeAll(async () => {
  const up =
    !!url &&
    !!anonKey &&
    (await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    }).then(
      (r) => r.ok,
      () => false,
    ));
  test.skip(!up, "e2e skipped: local Supabase unreachable. Run: npx supabase start");
  await seed(localAdmin());
});

async function logIn(page: Page, email: string, password: string = SEED.password) {
  await page.goto("/login");
  await page.getByLabel(fr.login.email).fill(email);
  await page.getByLabel(fr.login.password).fill(password);
  await page.getByRole("button", { name: fr.login.submit }).click();
}

test("Partenaire logs in on web", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await logIn(page, SEED.emails.a);
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: `${SEED.names.a} & ${SEED.names.b}` }),
  ).toBeVisible();
  await expect(page.getByText(fr.home.milestone.title)).toBeVisible();
  await expect(page.getByText(/\d jours/).first()).toBeVisible();
  await expect(page.getByText(SEED.specialDates.shared)).toBeVisible();
  await expect(page.getByText(SEED.specialDates.private)).toHaveCount(0);
  await page.getByRole("button", { name: fr.home.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("Stranger cannot enter", async ({ page }) => {
  await logIn(page, SEED.emails.stranger);
  await expect(page.getByRole("alert").filter({ hasText: fr.login.invalid })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(fr.home.milestone.title)).toHaveCount(0);
});

async function accessToken(email: string): Promise<string> {
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: SEED.password });
  if (error || !data.session) throw error ?? new Error(`no session for ${email}`);
  return data.session.access_token;
}

test("non-member bearer is refused by API, public theme still answers", async ({ request }) => {
  const headers = { Authorization: `Bearer ${await accessToken(SEED.emails.stranger)}` };
  const home = await request.get("/api/home", { headers });
  expect(home.status()).toBe(401);
  expect((await home.json()).error.code).toBe("unauthorized");
  expect((await request.get("/api/theme", { headers })).status()).toBe(200);
});

test("partner bearer reaches API", async ({ request }) => {
  const headers = { Authorization: `Bearer ${await accessToken(SEED.emails.a)}` };
  expect((await request.get("/api/home", { headers })).status()).toBe(200);
});

test("login failures are indistinguishable", async ({ request }) => {
  const cases = [
    { email: "nobody@example.com", password: "x" },
    { email: SEED.emails.a, password: "not-the-password" },
    { email: SEED.emails.stranger, password: SEED.password },
  ];
  const results = [];
  for (const data of cases) {
    const started = Date.now();
    const res = await request.post("/api/session", { data });
    results.push({ status: res.status(), body: await res.json(), ms: Date.now() - started });
  }
  for (const r of results) {
    expect(r.status).toBe(401);
    expect(r.body).toEqual(results[0]?.body);
    expect(r.ms).toBeGreaterThanOrEqual(600);
  }
  const times = results.map((r) => r.ms);
  expect(Math.max(...times) - Math.min(...times)).toBeLessThan(50);
});

test("wrong password is invalid", async ({ page }) => {
  await logIn(page, SEED.emails.a, "not-the-password");
  await expect(page.getByRole("alert").filter({ hasText: fr.login.invalid })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("/setup once a Couple exists redirects to /login", async ({ page }) => {
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/login$/);
});
