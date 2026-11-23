import { cleanup, render, screen, within } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { envSchema, FIREBASE_KEYS, INSTALL_GUIDE_URL } from "@/shared/env";
import fr from "@/shared/i18n/messages/fr.json";

import { FIREBASE_ENV } from "../../../test/firebaseEnv";
import SetupPage from "./page";

const hasCouple = vi.fn();

vi.mock("@/features/setup/server/couple", () => ({
  hasCouple: () => hasCouple(),
}));
vi.mock("@/features/setup/server/firstRun", () => ({
  createFirstCouple: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "setup") =>
    createTranslator({ locale: "fr", messages: fr, namespace }),
}));

const validEnv: Record<string, string> = {
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  MESSAGE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  SETUP_TOKEN: "x".repeat(32),
  ...FIREBASE_ENV,
  CRON_SECRET: "s3cret-s3cret-s3cret",
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

test("renders with an empty environment", async () => {
  for (const key of Object.keys(envSchema.shape)) vi.stubEnv(key, "");

  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SetupPage()}
    </NextIntlClientProvider>,
  );

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(fr.setup.title);
  expect(screen.getAllByText(fr.setup.status.missing)).toHaveLength(
    Object.keys(envSchema.shape).length - FIREBASE_KEYS.length - 1,
  );
  expect(screen.getAllByText(fr.setup.status.optional)).toHaveLength(FIREBASE_KEYS.length + 1);
  expect(screen.queryByText(fr.setup.firstRun.title)).toBeNull();
  expect(hasCouple).not.toHaveBeenCalled();
});

test("renders the step titles in order and the full wiki guide link", async () => {
  for (const key of Object.keys(envSchema.shape)) vi.stubEnv(key, "");

  const { container } = render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SetupPage()}
    </NextIntlClientProvider>,
  );

  expect(
    within(container)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent),
  ).toEqual([
    fr.setup.steps.vercel.title,
    fr.setup.steps.supabase.title,
    fr.setup.steps.firebase.title,
    fr.setup.steps.other.title,
  ]);
  expect(
    within(container).getByRole("link", { name: fr.setup.fullGuide }).getAttribute("href"),
  ).toBe(INSTALL_GUIDE_URL);
});

test("env ok without Firebase -> optional rows, first-run form shown", async () => {
  const noFirebase = Object.fromEntries(
    Object.entries(validEnv).filter(([k]) => !FIREBASE_KEYS.includes(k)),
  );
  for (const k of FIREBASE_KEYS) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(noFirebase)) vi.stubEnv(k, v);
  hasCouple.mockResolvedValue(false);
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SetupPage()}
    </NextIntlClientProvider>,
  );
  expect(screen.getAllByText(fr.setup.status.optional)).toHaveLength(FIREBASE_KEYS.length);
  expect(screen.getByText(fr.setup.firstRun.title)).toBeTruthy();
});

test("env ok and a Couple exists -> redirect to /", async () => {
  for (const [k, v] of Object.entries(validEnv)) vi.stubEnv(k, v);
  hasCouple.mockResolvedValue(true);
  await expect(SetupPage()).rejects.toThrow("redirect:/");
});

test("env ok except SETUP_TOKEN -> row missing, no first-run form", async () => {
  for (const [k, v] of Object.entries({ ...validEnv, SETUP_TOKEN: "" })) vi.stubEnv(k, v);
  hasCouple.mockResolvedValue(false);
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SetupPage()}
    </NextIntlClientProvider>,
  );
  expect(screen.getAllByText(fr.setup.status.missing)).toHaveLength(1);
  expect(screen.queryByText(fr.setup.firstRun.title)).toBeNull();
  expect(hasCouple).not.toHaveBeenCalled();
});

test("env ok and no Couple -> checklist and first-run form", async () => {
  for (const [k, v] of Object.entries(validEnv)) vi.stubEnv(k, v);
  hasCouple.mockResolvedValue(false);
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SetupPage()}
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole("heading", { name: fr.setup.firstRun.title })).toBeTruthy();
  expect(screen.getAllByText(fr.setup.status.ok)).toHaveLength(Object.keys(envSchema.shape).length);
});
