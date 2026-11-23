import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, test } from "vitest";

import { INSTALL_GUIDE_URL, envSchema } from "@/shared/env";
import { checkEnv } from "@/shared/envChecklist";
import fr from "@/shared/i18n/messages/fr.json";

import { SetupChecklist } from "./SetupChecklist";

function renderItems(items: ReturnType<typeof checkEnv>) {
  return render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      <SetupChecklist items={items} />
    </NextIntlClientProvider>,
  );
}

function rowOf(key: string) {
  return screen.getByText(key).closest("li") as HTMLElement;
}

test("shows each key with its status and never a value", () => {
  renderItems(
    checkEnv(envSchema, {
      SUPABASE_URL: "nope",
      SUPABASE_SERVICE_ROLE_KEY: "supersecretvalue1234",
    }),
  );

  for (const key of Object.keys(envSchema.shape)) expect(screen.getByText(key)).toBeTruthy();
  expect(rowOf("SUPABASE_URL").textContent).toContain(fr.setup.status.invalid);
  expect(rowOf("SUPABASE_SERVICE_ROLE_KEY").textContent).toContain(fr.setup.status.ok);
  expect(rowOf("SUPABASE_ANON_KEY").textContent).toContain(fr.setup.status.missing);
  expect(document.body.textContent).not.toContain("supersecretvalue1234");
  expect(document.body.textContent).not.toContain("nope");
});

test("each row links to its wiki guide anchor", () => {
  const { container } = renderItems(checkEnv(envSchema, {}));

  const row = within(container).getByText("MESSAGE_ENCRYPTION_KEY").closest("li") as HTMLElement;
  expect(row.querySelector("a")?.getAttribute("href")).toMatch(/#message_encryption_key$/);
});

test("a var without message falls back to the generic how-to", () => {
  renderItems(checkEnv(envSchema.extend({ NEW_VAR: envSchema.shape.SUPABASE_ANON_KEY }), {}));

  expect(rowOf("NEW_VAR").textContent).toContain(fr.setup.genericHowTo);
});

test("an unknown var renders under the other section", () => {
  const { container } = renderItems(
    checkEnv(envSchema.extend({ NEW_VAR: envSchema.shape.SUPABASE_ANON_KEY }), {}),
  );

  expect(
    within(container).getByRole("heading", {
      name: fr.setup.steps.other.title,
    }),
  ).toBeTruthy();
  expect(within(container).getByText("NEW_VAR").closest("section")?.textContent).toContain(
    fr.setup.steps.other.title,
  );
});

test("one link to the full wiki guide, no inline instructions", () => {
  const { container } = renderItems(checkEnv(envSchema, {}));

  const link = within(container).getByRole("link", {
    name: fr.setup.fullGuide,
  });
  expect(link.getAttribute("href")).toBe(INSTALL_GUIDE_URL);
  expect(container.querySelector("ol")).toBeNull();
});
