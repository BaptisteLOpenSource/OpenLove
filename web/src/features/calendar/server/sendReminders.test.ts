import { beforeEach, expect, test, vi } from "vitest";

import { notify } from "@/shared/push/notify";
import { adminClient } from "@/shared/supabase/server";

import { sendReminders } from "./sendReminders";

vi.mock("@/shared/push/notify", () => ({ notify: vi.fn() }));
vi.mock("@/shared/supabase/server", () => ({ adminClient: vi.fn() }));
vi.mock("next-intl/server", async () => {
  const { default: fr } = await import("@/shared/i18n/messages/fr.json");
  return {
    getTranslations: async () => (k: string, v: Record<string, string>) =>
      (fr.reminder as Record<string, string>)[k]!.replace(/\{(\w+)\}/g, (_, n) => v[n] ?? ""),
  };
});

const rows = {
  special_dates: [
    { id: "d1", couple_id: "c1", label: "Anniv", date: "2019-10-25", private_to: null },
    { id: "d2", couple_id: "c1", label: "Surprise", date: "2020-10-25", private_to: "u2" },
    { id: "d3", couple_id: "c1", label: "Loin", date: "2020-03-01", private_to: null },
  ],
  couple_members: [
    { couple_id: "c1", user_id: "u1" },
    { couple_id: "c1", user_id: "u2" },
  ],
};

beforeEach(() => {
  vi.mocked(notify).mockReset();
  vi.mocked(adminClient).mockReturnValue({
    from: (t: keyof typeof rows) => ({ select: async () => ({ data: rows[t], error: null }) }),
  } as never);
});

test("shared date reaches both Partenaires, private date only its owner", async () => {
  const sent = await sendReminders(new Date("2026-10-25T08:00:00Z"));

  expect(sent).toBe(3);
  const to = (id: string) =>
    vi
      .mocked(notify)
      .mock.calls.filter(([u]) => u === id)
      .map(([, p]) => p.tag);
  expect(to("u1")).toEqual(["reminder-d1"]);
  expect(to("u2").sort()).toEqual(["reminder-d1", "reminder-d2"]);
  expect(notify).toHaveBeenCalledWith("u1", {
    title: "Rappel",
    body: "Anniv, c'est aujourd'hui !",
    url: "/",
    tag: "reminder-d1",
  });
});

test("7 days before uses the days text", async () => {
  await sendReminders(new Date("2026-10-18T08:00:00Z"));
  expect(vi.mocked(notify).mock.calls[0]![1].body).toBe("Anniv, dans 7 jours.");
});
