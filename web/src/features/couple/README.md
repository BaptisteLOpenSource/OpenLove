# couple

The Couple an instance serves and its two Partenaires.

- Language: Couple (`couples`), Partenaire (`couple_members`, role `partner_a` | `partner_b`).
- Provenance: identity = `couple_members` row keyed by the auth account id (S1), never email or
  metadata. Schema in `supabase/migrations/*_couple.sql`; dev data from `web/scripts/seed.ts`.
- Invariants: one Couple per account (`user_id` primary key), at most 2 Partenaires per Couple
  (`unique (couple_id, role)`). RLS on both tables, read-only to members of the same Couple via
  `private.my_couple_id()` (S8/S9); writes go through the service role only. "One Couple per
  instance" is enforced by bootstrap, not the DB.
- Web login: server action `server/auth.ts` (`signIn`, `signOut`). No role claim = signed out,
  answered `invalid` like a wrong password. Role = `app_metadata.role`, mirrored from
  `couple_members` by trigger (migration `role_claim`). `src/proxy.ts` is the single guard:
  valid token + role, else 401 (API) / `/login` (pages). `partnerOf` only looks up the Couple
  (data access), its role comes from the same claim via `roleOf`. Login paths floored at 600 ms
  (`server/atLeast.ts`). ADR 0011.
- Appairage: `server/pairing.ts`. Code stored as sha256 only, TTL 5 min, single use via atomic
  delete-returning, membership re-checked at exchange, one live code per Partenaire. Session minted
  by admin `generateLink` magiclink + `verifyOtp`. Limiter: Postgres fixed window, keys
  `pairing:<ip>` / `login:<ip>`, 10 per 15 min (`domain/limits.ts`). IP = rightmost
  `x-forwarded-for` hop: assumes one trusted proxy (Vercel); self-host must set one. [ADR 0005](../../../../docs/decisions/0005-qr-pairing-mobile.md).
- Invitation partner_b: `server/invite.ts`. partner_a only, link `/invite/<token>` (public prefix in
  `src/proxy.ts`), sha256 stored in `couple_invites`, TTL 24 h, single use, one live per Couple.
  Redeem = limiter `invite:<ip>`, consume, admin `createUser`, SQL `add_partner_b` (null once
  partner_b exists, user deleted), sign-in. Refusal is one generic message. Consumed before
  `createUser`: a failed signup burns the link, partner_a makes a new one (no re-insert race).
  `/invite/*` sends `Referrer-Policy: no-referrer` (token in path).
- Android session: `server/session.ts`, `POST /api/session` (email+password, same `login:<ip>` limiter, no role = revoked + 401) and `POST /api/session/refresh` (R1/R2).
- Decision: [ADR 0002](../../../../docs/decisions/0002-supabase-single-data-path.md).
