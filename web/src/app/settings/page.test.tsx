import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import fr from "@/shared/i18n/messages/fr.json";

import SettingsPage from "./page";

let configured = true;
vi.mock("@/shared/env", () => ({ firebaseConfigured: () => configured }));
vi.mock("@/shared/supabase/server", () => ({
  partnerOf: async () => ({ ok: true, partner: { role: "partner_b" } }),
  serverClient: async () => ({
    from: () => ({ select: () => ({ eq: async () => ({ count: 1 }) }) }),
  }),
}));
vi.mock("@/features/couple/server/invite", () => ({ createInvite: vi.fn() }));
vi.mock("@/features/couple/ui/InvitePanel", () => ({ InvitePanel: () => null }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "settings") =>
    createTranslator({ locale: "fr", messages: fr, namespace }),
}));
vi.mock("@/features/couple/server/showPairing", () => ({ showPairing: vi.fn() }));
vi.mock("@/features/couple/ui/PairingPanel", () => ({ PairingPanel: () => null }));
vi.mock("@/features/notifications/ui/PushToggle", () => ({
  PushToggle: () => <p>push-toggle</p>,
}));

afterEach(cleanup);
beforeEach(() => {
  configured = true;
});

const renderPage = async () =>
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {await SettingsPage()}
    </NextIntlClientProvider>,
  );

test("Firebase configured -> PushToggle rendered", async () => {
  await renderPage();
  expect(screen.getByText("push-toggle")).toBeTruthy();
});

test("Firebase not configured -> no PushToggle", async () => {
  configured = false;
  await renderPage();
  expect(screen.queryByText("push-toggle")).toBeNull();
});
