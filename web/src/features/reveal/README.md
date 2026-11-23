# reveal

Surprises and Lettres: one Partenaire writes, the other reads once `reveal_at` passes.

- Language: Reveal (`reveals`, `kind` = `surprise` | `letter`). See `CONTEXT.md`.
- Provenance: `/api/reveals` (GET list, POST create) via `server/reveals.ts`. List only, no detail route.
- Invariants: title and body encrypted AES-256-GCM before insert (`shared/crypto.ts`, same key as
  Messages). Reveal decided by clock only: DB `now()` in RLS, server `new Date()` into `domain/reveal.ts`.
- Before reveal the other Partenaire gets a placeholder (`locked:true`, title and body null) from RPC
  `pending_reveals` (SECURITY DEFINER, never selects title/body). RLS hides the row itself.
  The author sees own pending item in full (`locked:true`, content present).
- Insert: `author_id = auth.uid()` and `reveal_at > now()`. No update/delete grant.
- Order: revealed newest first, then locked soonest first.
- Known limit: an undecryptable row is skipped (a Partenaire can insert a raw blob via PostgREST).
