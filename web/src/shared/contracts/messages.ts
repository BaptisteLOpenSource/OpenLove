import { z } from "zod";

export const MAX_LIMIT = 100;

export const message = z.strictObject({
  id: z.string().regex(/^\d+$/),
  authorId: z.uuid(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

export const sendMessageInput = z.object({ text: z.string().trim().min(1).max(4000) });

export const messagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(50),
  cursor: z
    .string()
    .regex(/^\d{1,18}$/)
    .optional(),
});

const messageId = z.string().regex(/^\d+$/);

export const messagesResponse = z.strictObject({
  items: z.array(message),
  nextCursor: messageId.nullable(),
  // last Message the other Partenaire read; null = never
  partnerReadId: messageId.nullable(),
});

export const markReadResponse = z.strictObject({ lastReadId: messageId.nullable() });

const sample = {
  id: "42",
  authorId: "0192f6c4-5b1a-7c55-9a43-0d2f6f6a9b11",
  body: "Bonne nuit",
  createdAt: "2026-10-30T22:00:00.000Z",
};

export const examples = {
  valid: [
    { items: [sample], nextCursor: "42", partnerReadId: "42" },
    { items: [], nextCursor: null, partnerReadId: null },
  ],
  invalid: [
    { items: [sample], partnerReadId: null },
    { items: [{ ...sample, body: 1 }], nextCursor: null, partnerReadId: null },
    { items: [{ ...sample, body: undefined }], nextCursor: null, partnerReadId: null },
  ],
};
