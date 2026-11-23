import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, test, vi } from "vitest";

import fr from "@/shared/i18n/messages/fr.json";

import { enablePush } from "./enablePush";
import { PushToggle } from "./PushToggle";

vi.mock("./enablePush", () => ({ enablePush: vi.fn() }));

afterEach(cleanup);

const renderToggle = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      <PushToggle />
    </NextIntlClientProvider>,
  );

test("enabled -> status shown, button locked", async () => {
  vi.mocked(enablePush).mockResolvedValue("enabled");
  renderToggle();
  fireEvent.click(screen.getByRole("button", { name: fr.settings.push.enable }));
  expect((await screen.findByRole("status")).textContent).toBe(fr.settings.push.result.enabled);
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
});

test("denied -> alert, button stays usable", async () => {
  vi.mocked(enablePush).mockResolvedValue("denied");
  renderToggle();
  fireEvent.click(screen.getByRole("button", { name: fr.settings.push.enable }));
  expect((await screen.findByRole("alert")).textContent).toBe(fr.settings.push.result.denied);
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});
