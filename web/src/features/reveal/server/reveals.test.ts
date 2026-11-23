// @vitest-environment node
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { localAdmin, SEED, seed } from "../../../../scripts/seed";
import { createReveal, listReveals } from "./reveals";

vi.mock("server-only", () => ({}));

const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const up =
  !!url &&
  !!anonKey &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!process.env.MESSAGE_ENCRYPTION_KEY &&
  (await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } }).then(
    (r) => r.ok,
    () => false,
  ));

async function signedIn(email: string): Promise<{ sb: SupabaseClient; userId: string }> {
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: SEED.password });
  if (error) throw error;
  return { sb, userId: data.user.id };
}

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe.skipIf(!up)("reveals", () => {
  let coupleId = "";

  beforeAll(async () => {
    coupleId = (await seed(localAdmin())).coupleId;
  });

  test("b never sees a's pending content: not via list, not via raw table", async () => {
    const a = await signedIn(SEED.emails.a);
    const b = await signedIn(SEED.emails.b);
    const title = `t ${crypto.randomUUID()}`;
    const body = `b ${crypto.randomUUID()}`;
    const made = await createReveal(
      { userId: a.userId, coupleId },
      { kind: "letter", title, body, revealAt: inHours(1) },
      a.sb,
    );

    const seenByB = await listReveals(b.userId, b.sb);
    const placeholder = seenByB.items.find((r) => r.id === made.id);
    expect(placeholder).toMatchObject({
      locked: true,
      title: null,
      body: null,
      authorId: a.userId,
    });
    expect(JSON.stringify(seenByB)).not.toContain(title);

    const raw = await b.sb.from("reveals").select().eq("id", made.id);
    expect(raw.data).toEqual([]);

    const mine = (await listReveals(a.userId, a.sb)).items.find((r) => r.id === made.id);
    expect(mine).toMatchObject({ locked: true, title, body });

    const stored = await localAdmin().from("reveals").select().eq("id", made.id).single();
    expect(JSON.stringify(stored.data)).not.toContain(title);
    expect(JSON.stringify(stored.data)).not.toContain(body);
  });

  test("past revealAt is rejected", async () => {
    const a = await signedIn(SEED.emails.a);
    await expect(
      createReveal(
        { userId: a.userId, coupleId },
        { kind: "surprise", title: "x", body: "y", revealAt: inHours(-1) },
        a.sb,
      ),
    ).rejects.toMatchObject({ status: 400, code: "validation_failed" });
  });

  test("once revealAt passes, b reads the content", async () => {
    const a = await signedIn(SEED.emails.a);
    const b = await signedIn(SEED.emails.b);
    const made = await createReveal(
      { userId: a.userId, coupleId },
      { kind: "surprise", title: "open", body: "now", revealAt: inHours(1) },
      a.sb,
    );
    await localAdmin()
      .from("reveals")
      .update({ reveal_at: inHours(-1) })
      .eq("id", made.id);
    const got = (await listReveals(b.userId, b.sb)).items.find((r) => r.id === made.id);
    expect(got).toMatchObject({ locked: false, title: "open", body: "now" });
  });

  test("an undecryptable row is skipped", async () => {
    const a = await signedIn(SEED.emails.a);
    const bad = await localAdmin()
      .from("reveals")
      .insert({
        couple_id: coupleId,
        author_id: a.userId,
        kind: "letter",
        title_enc: "garbage",
        body_enc: "garbage",
        reveal_at: inHours(1),
      })
      .select("id")
      .single();
    const ids = (await listReveals(a.userId, a.sb)).items.map((r) => r.id);
    expect(ids).not.toContain(String(bad.data?.id));
  });
});
