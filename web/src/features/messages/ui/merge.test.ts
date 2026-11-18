import { expect, test } from "vitest";

import { mergeMessages, type Message, seenId } from "./merge";

const m = (id: string, body = id): Message => ({
  id,
  authorId: "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b11",
  body,
  createdAt: "2026-10-30T10:00:00.000Z",
});

test("dedupes by id, keeps the later copy", () => {
  expect(mergeMessages([m("1", "old")], [m("1", "new")])).toEqual([m("1", "new")]);
});

test("sorts numerically, not as text", () => {
  expect(mergeMessages([m("10")], [m("9")]).map((x) => x.id)).toEqual(["9", "10"]);
});

const own = (id: string) => ({ ...m(id), authorId: "me" });

test("seenId: last own message at or before the partner's read", () => {
  const items = [own("8"), m("9"), own("10"), own("12")];
  expect(seenId(items, "me", "11")).toBe("10");
  expect(seenId(items, "me", "12")).toBe("12");
  expect(seenId(items, "me", "7")).toBeNull();
});

test("seenId: never read, or no own message -> null", () => {
  expect(seenId([own("1")], "me", null)).toBeNull();
  expect(seenId([m("1")], "me", "5")).toBeNull();
});

test("older page merged in front keeps newer rows", () => {
  expect(mergeMessages([m("50"), m("51")], [m("49")]).map((x) => x.id)).toEqual(["49", "50", "51"]);
});
