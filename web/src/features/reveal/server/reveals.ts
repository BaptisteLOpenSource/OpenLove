import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { createRevealInput, Reveal } from "@/shared/contracts/reveals";
import { decrypt, encrypt } from "@/shared/crypto";
import { env } from "@/shared/env";
import { ApiError } from "@/shared/http/withContract";
import type { Partner } from "@/shared/supabase/server";

import { type RevealRow, sortReveals, toReveal } from "../domain/reveal";

type Stored = Omit<RevealRow, "title" | "body"> & { title_enc: string; body_enc: string };
type Pending = Omit<RevealRow, "title" | "body">;

const key = () => Buffer.from(env().MESSAGE_ENCRYPTION_KEY, "base64");
const COLUMNS = "id, kind, author_id, reveal_at, title_enc, body_enc";

function decode(r: Stored, me: string, now: Date): Reveal[] {
  try {
    const { title_enc, body_enc, ...rest } = r;
    const hide = new Date(r.reveal_at) > now && r.author_id !== me;
    const content = hide
      ? { title: null, body: null }
      : { title: decrypt(key(), title_enc), body: decrypt(key(), body_enc) };
    return [toReveal({ ...rest, ...content }, me, now)];
  } catch {
    console.error(`reveal ${r.id} undecryptable`);
    return [];
  }
}

export async function listReveals(userId: string, sb: SupabaseClient, now = new Date()) {
  const [rows, pending] = await Promise.all([
    sb.from("reveals").select(COLUMNS),
    sb.rpc("pending_reveals"),
  ]);
  if (rows.error) throw rows.error;
  if (pending.error) throw pending.error;
  const seen = new Set((rows.data as Stored[]).map((r) => r.id));
  const placeholders = (pending.data as Pending[])
    .filter((p) => !seen.has(p.id))
    .map((p) => toReveal({ ...p, title: null, body: null }, userId, now));
  const items = (rows.data as Stored[]).flatMap((r) => decode(r, userId, now));
  return { items: sortReveals([...items, ...placeholders]), me: userId };
}

export async function createReveal(
  partner: Pick<Partner, "userId" | "coupleId">,
  input: z.output<typeof createRevealInput>,
  sb: SupabaseClient,
  now = new Date(),
): Promise<Reveal> {
  if (new Date(input.revealAt) <= now) {
    throw new ApiError(400, "validation_failed", "revealAt must be in the future");
  }
  const { data, error } = await sb
    .from("reveals")
    .insert({
      couple_id: partner.coupleId,
      author_id: partner.userId,
      kind: input.kind,
      title_enc: encrypt(key(), input.title),
      body_enc: encrypt(key(), input.body),
      reveal_at: input.revealAt,
    })
    .select("id, kind, author_id, reveal_at")
    .single();
  if (error) throw error;
  return toReveal({ ...data, title: input.title, body: input.body }, partner.userId, now);
}
