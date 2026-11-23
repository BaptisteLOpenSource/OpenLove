import { expect, test } from "vitest";

import { sortReveals, toReveal } from "./reveal";

const me = "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b11";
const other = "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b22";
const now = new Date("2026-12-01T10:00:00.000Z");
const row = (over: object = {}) => ({
  id: 1,
  kind: "letter" as const,
  author_id: other,
  reveal_at: "2026-12-24T08:00:00.000Z",
  title: "secret title",
  body: "secret body",
  ...over,
});

test("partner pending: locked, no title nor body", () => {
  const r = toReveal(row(), me, now);
  expect(r).toMatchObject({ locked: true, title: null, body: null, authorId: other });
  expect(JSON.stringify(r)).not.toContain("secret");
});

test("partner pending without content stays a placeholder", () => {
  expect(toReveal(row({ title: null, body: null }), me, now).locked).toBe(true);
});

test("own pending: locked flag, full content", () => {
  expect(toReveal(row({ author_id: me }), me, now)).toMatchObject({
    locked: true,
    title: "secret title",
    body: "secret body",
  });
});

test("revealed: content for both, boundary reveal_at == now is revealed", () => {
  const r = toReveal(row({ reveal_at: now.toISOString() }), me, now);
  expect(r).toMatchObject({ locked: false, title: "secret title", body: "secret body" });
});

test("now param is the only clock", () => {
  const early = new Date("2000-01-01T00:00:00.000Z");
  expect(toReveal(row({ reveal_at: "2010-01-01T00:00:00.000Z" }), me, early).locked).toBe(true);
});

test("revealed newest first, then locked soonest first", () => {
  const mk = (id: number, at: string) => toReveal(row({ id, reveal_at: at }), me, now);
  const items = [
    mk(1, "2026-12-30T00:00:00.000Z"),
    mk(2, "2026-11-01T00:00:00.000Z"),
    mk(3, "2026-12-25T00:00:00.000Z"),
    mk(4, "2026-11-20T00:00:00.000Z"),
  ];
  expect(sortReveals(items).map((r) => r.id)).toEqual(["4", "2", "3", "1"]);
});
