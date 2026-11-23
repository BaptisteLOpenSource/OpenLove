import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { after } from "next/server";
import type { z } from "zod";

import type { message, messagesQuery } from "@/shared/contracts/messages";
import { decrypt, encrypt } from "@/shared/crypto";
import { env } from "@/shared/env";
import { notify } from "@/shared/push/notify";
import { adminClient, type Partner } from "@/shared/supabase/server";

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
  sb: SupabaseClient,
): Promise<Message> {
  const { data, error } = await sb
    .from("messages")
    .insert({
      couple_id: partner.coupleId,
      author_id: partner.userId,
      body_enc: encrypt(key(), text),
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  after(() => pushToPartner(partner));
  return toMessage(data);
}

// Generic text only (ADR 0004): the Message content never leaves the server. Never fails the send.
async function pushToPartner({ userId, coupleId }: Pick<Partner, "userId" | "coupleId">) {
  try {
    const { data, error } = await adminClient()
      .from("couple_members")
      .select("user_id")
      .eq("couple_id", coupleId)
      .neq("user_id", userId);
    if (error) throw error;
    const t = await getTranslations("messages.push");
    const payload = { title: t("title"), body: t("body"), url: "/messages", tag: "chat" };
    await Promise.all(data.map((m) => notify(m.user_id, payload)));
  } catch (err) {
    console.error("message push failed", err instanceof Error ? err.message : err);
  }
}

export async function listMessages(
  { limit, cursor }: z.output<typeof messagesQuery>,
  userId: string,
  sb: SupabaseClient,
) {
  let q = sb
    .from("messages")
    .select(COLUMNS)
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) q = q.lt("id", cursor);
  const { data, error } = await q;
  if (error) throw error;
  const { data: read, error: readError } = await sb
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
    me: userId,
  };
}

// The RPC picks the newest id and never moves read backward: clients cannot write message_reads.
export async function markRead(sb: SupabaseClient): Promise<{ lastReadId: string | null }> {
  const { data, error } = await sb.rpc("mark_message_read");
  if (error) throw error;
  return { lastReadId: data == null ? null : String(data) };
}
