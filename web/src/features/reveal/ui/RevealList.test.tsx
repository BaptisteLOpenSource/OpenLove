import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, test } from "vitest";

import type { Reveal } from "@/shared/contracts/reveals";
import fr from "@/shared/i18n/messages/fr.json";

import { RevealList } from "./RevealList";

afterEach(cleanup);

const ME = "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b11";
const OTHER = "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b22";
const base: Reveal = {
  id: "1",
  kind: "letter",
  authorId: OTHER,
  revealAt: "2026-12-24T08:00:00.000Z",
  locked: false,
  title: "Pour toi",
  body: "Joyeux Noël",
};

const renderItems = (items: Reveal[]) =>
  render(
    <NextIntlClientProvider locale="fr" messages={fr} timeZone="UTC">
      <RevealList items={items} me={ME} />
    </NextIntlClientProvider>,
  );

test("empty -> empty state", () => {
  renderItems([]);
  expect(screen.getByText(fr.reveal.empty)).toBeTruthy();
});

test("revealed -> title, body, date", () => {
  renderItems([base]);
  expect(screen.getByText("Pour toi")).toBeTruthy();
  expect(screen.getByText("Joyeux Noël")).toBeTruthy();
  expect(screen.getByText(/24 décembre 2026/)).toBeTruthy();
});

test("partner locked -> placeholder only", () => {
  renderItems([{ ...base, kind: "surprise", locked: true, title: null, body: null }]);
  expect(screen.getByText(/Une surprise arrive le 24 décembre 2026/)).toBeTruthy();
  expect(screen.queryByText("Pour toi")).toBeNull();
});

test("own pending -> full content + scheduled", () => {
  renderItems([{ ...base, authorId: ME, locked: true }]);
  expect(screen.getByText("Pour toi")).toBeTruthy();
  expect(screen.getByText(/programmée pour 24 décembre 2026/)).toBeTruthy();
});
