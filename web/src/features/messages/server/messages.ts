import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { message, messagesQuery } from "@/shared/contracts/messages";
import { env } from "@/shared/env";
import { type Partner, serverClient } from "@/shared/supabase/server";

import { decrypt, encrypt } from "./crypto";

type Message = z.input<typeof message>;
type Row = { id: number; author_id: string; body_enc: string; created_at: string };

const key = () => Buffer.from(env().MESSAGE_ENCRYPTION_KEY, "base64");

const toMessage = (r: Row): Message => ({
  id: String(r.id),
  authorId: r.author_id,
  body: decrypt(key(), r.body_enc),
  createdAt: new Date(r.created_at).toISOString(),
});

// a Partenaire can insert a raw blob via PostgREST: skip it, keep the page
function readable(r: Row): Message[] {
  try {
    return [toMessage(r)];
  } catch {
    console.error(`message ${r.id} undecryptable`);
    return [];
  }
}

const COLUMNS = "id, author_id, body_enc, created_at";

export async function sendMessage(
  partner: Pick<Partner, "userId" | "coupleId">,
  text: string,
  sb?: SupabaseClient,
): Promise<Message> {
  const { data, error } = await (sb ?? (await serverClient()))
    .from("messages")
    .insert({
      couple_id: partner.coupleId,
      author_id: partner.userId,
      body_enc: encrypt(key(), text),
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toMessage(data);
}

export async function listMessages(
  { limit, cursor }: z.output<typeof messagesQuery>,
  userId: string,
  sb?: SupabaseClient,
) {
  const client = sb ?? (await serverClient());
  let q = client
    .from("messages")
    .select(COLUMNS)
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) q = q.lt("id", cursor);
  const { data, error } = await q;
  if (error) throw error;
  const { data: read, error: readError } = await client
    .from("message_reads")
    .select("last_read_id")
    .neq("partner_id", userId)
    .maybeSingle();
  if (readError) throw readError;
  const page = data.slice(0, limit);
  return {
    items: page.flatMap(readable),
    nextCursor: data.length > limit ? String(page[page.length - 1]?.id) : null,
    partnerReadId: read ? String(read.last_read_id) : null,
  };
}

// id from the server, never from the client: a Partenaire cannot mark future Messages read
export async function markRead(
  partner: Pick<Partner, "userId" | "coupleId">,
  sb?: SupabaseClient,
): Promise<{ lastReadId: string | null }> {
  const client = sb ?? (await serverClient());
  const { data, error } = await client
    .from("messages")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { lastReadId: null };
  const { error: upsertError } = await client
    .from("message_reads")
    .upsert(
      { couple_id: partner.coupleId, partner_id: partner.userId, last_read_id: data.id },
      { onConflict: "couple_id,partner_id" },
    );
  if (upsertError) throw upsertError;
  return { lastReadId: String(data.id) };
}
