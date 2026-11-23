import { z } from "zod";

export const REVEAL_KINDS = ["surprise", "letter"] as const;

export const reveal = z.strictObject({
  id: z.string().regex(/^\d+$/),
  kind: z.enum(REVEAL_KINDS),
  authorId: z.uuid(),
  revealAt: z.iso.datetime(),
  // true until revealAt passes; the author still sees own content
  locked: z.boolean(),
  title: z.string().nullable(),
  body: z.string().nullable(),
});

export type Reveal = z.input<typeof reveal>;

export const revealsResponse = z.strictObject({
  items: z.array(reveal),
  me: z.uuid(),
});

export const createRevealInput = z.strictObject({
  kind: z.enum(REVEAL_KINDS),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10000),
  revealAt: z.iso.datetime(),
});

const me = "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b11";
const sample = {
  id: "7",
  kind: "letter",
  authorId: me,
  revealAt: "2026-12-24T08:00:00.000Z",
  locked: false,
  title: "Pour toi",
  body: "Joyeux Noël",
};

export const examples = {
  valid: [
    { items: [sample], me },
    { items: [{ ...sample, locked: true, title: null, body: null }], me },
    { items: [], me },
  ],
  invalid: [
    { items: [sample] },
    { items: [{ ...sample, kind: "quiz" }], me },
    { items: [{ ...sample, locked: undefined }], me },
    { items: [{ ...sample, title: undefined }], me },
  ],
};

export type RevealState = { error?: "invalid" | "failed"; ok?: true };
