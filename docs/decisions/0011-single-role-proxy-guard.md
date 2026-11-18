# 0011 - One role in app_metadata, enforced at the proxy, fixed-floor login

- Status: accepted (2026-11-18)

## Context
`proxy.ts` only checked the Supabase JWT. The role (partner A / B) was inferred per route from
`user_metadata.pseudo` (user-editable), env e-mail lists, or an e-mail prefix. An account with a
valid JWT but no recognised role saw some pages and got 401 on others. Login timing and error
shape leaked whether an e-mail existed.

## Decision
- One role source: `app_metadata.role` in `partner_a` | `partner_b`. Written only with the service
  role. No `dev` role: test accounts live outside `couple_members`.
- `proxy.ts` is the single guard: valid token AND recognised role, else 401 (API) or redirect to
  `/login` (pages). Nothing is served before this check.
- Login server action answers the same body and takes the same time (fixed floor) whether the e-mail is unknown, the password is wrong, or the role is absent.
- Removed: `user_metadata.pseudo`, e-mail prefix fallback, `SUPABASE_USER_*_EMAIL`,
  `NEXT_PUBLIC_SUPABASE_USER_*_ID`.

## Consequences
- Role cannot be changed by the user. Existing accounts need a migration that sets `app_metadata.role`.
- Android signs in through our `/api/session` too, so the constant-time floor covers it. The role
  check applies on every `/api/*` call (the proxy now reads the Bearer token).
- Public sign-up must stay off on the hosted project (see #13).
