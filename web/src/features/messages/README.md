# messages

Chat between the two Partenaires of a Couple.

- Language: Message (`messages`), text only in this slice. See `CONTEXT.md`.
- Provenance: `/api/messages` (GET cursor list, POST send), `/api/messages/read` (POST, marks read)
  and the `/messages` page, all via `server/messages.ts`. Ordering and cursor = identity `id`
  (newest first, `cursor` = last id seen). Browser store `ui/useChat.ts` is the only `fetch` caller.
- Vu: `message_reads` row per Partenaire. `partnerReadId` = other Partenaire's row. Marked read id
  is picked by the server (newest Message), never by the client.
- Realtime: private channel `couple:<coupleId>`. DB triggers `realtime.send` on insert `messages`
  and insert/update `message_reads`, payload = id only, never body. Typing = client broadcast,
  throttled 2 s, shown 5 s. Every event refetches; re-SUBSCRIBED refetches too (missed signals).
- Invariants: `limit` 1..100 (Zod, default 50). Text trimmed, 1..4000 chars. Text encrypted with
  AES-256-GCM before insert ([ADR 0010](../../../../docs/decisions/0010-message-encryption-at-rest.md)).
  RLS: read and insert scoped to `private.my_couple_id()`, insert needs `author_id = auth.uid()`.
  No update/delete grant.
