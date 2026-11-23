# setup

`/setup` env checklist: one row per `envSchema` key with status ok / missing / invalid.

- Provenance: derived from `shared/env.ts` at request time, never from `env()` (it throws on invalid).
- Invariant: values and Zod messages never reach the DOM. How-to text is `setup.vars.<KEY>` in fr.json, generic fallback otherwise.
- Steps: `steps.ts` maps key prefix -> step; title `setup.steps.<id>.title` in fr.json. Guides live ONLY in the wiki (`site/.../wiki/installer`), `wikiDoc.test.ts` checks one `## KEY` heading + `docUrl` per env key. New service = one `steps` entry + wiki section.
- Gating: env invalid -> checklist only. Env ok + no Couple -> checklist + first-run form. Env ok + Couple exists -> redirect `/`. First-run needs `SETUP_TOKEN` (env, required): `createFirstCouple` checks it first, constant-time, before any DB call; `create_couple` (null = exists) re-checked because server actions are directly callable.
- Bootstrap: `server/firstRun.ts` creates the auth user (admin), calls `create_couple` (partner_a + Couple, service role only), deletes the user on failure, then signs in. `hasCouple` lives in `server/couple.ts` so it is not a server action.
