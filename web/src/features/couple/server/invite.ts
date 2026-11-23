"use server";
import { randomBytes } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clientIp } from "@/shared/http/clientIp";
import { adminClient, partnerOf, serverClient } from "@/shared/supabase/server";

import { INVITE_LIMIT, INVITE_TTL_SECONDS, LOGIN_FLOOR_MS } from "../domain/limits";
import { atLeast } from "./atLeast";
import { sha256 } from "./pairing";
import { hitRateLimit } from "./rateLimit";

export type InviteState = { error?: "invalid" | "rate_limited" };

const credentials = z.object({ email: z.email(), password: z.string().min(8) });

export async function createInvite(): Promise<{ url: string } | { error: "refused" }> {
  const result = await partnerOf(await serverClient());
  if (!result.ok || result.partner.role !== "partner_a") return { error: "refused" };
  const { coupleId } = result.partner;
  const admin = adminClient();
  const { count, error: countError } = await admin
    .from("couple_members")
    .select("user_id", { count: "exact", head: true })
    .eq("couple_id", coupleId)
    .eq("role", "partner_b");
  if (countError) throw countError;
  if (count) return { error: "refused" };

  const token = randomBytes(32).toString("base64url");
  const { error: clearError } = await admin
    .from("couple_invites")
    .delete()
    .eq("couple_id", coupleId);
  if (clearError) throw clearError;
  const { error } = await admin.from("couple_invites").insert({
    token_hash: sha256(token),
    couple_id: coupleId,
    expires_at: new Date(Date.now() + INVITE_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw error;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  return { url: `${origin}/invite/${token}` };
}

export async function redeemInvite(
  token: string,
  _prev: InviteState,
  form: FormData,
): Promise<InviteState> {
  const result = await atLeast(LOGIN_FLOOR_MS, () => attempt(token, form));
  if (result !== "ok") return result;
  redirect("/");
}

async function attempt(token: string, form: FormData): Promise<InviteState | "ok"> {
  const input = credentials.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const allowed = await hitRateLimit(
    `invite:${clientIp(await headers())}`,
    INVITE_LIMIT.max,
    INVITE_LIMIT.windowSeconds,
  );
  if (!allowed) return { error: "rate_limited" };

  const admin = adminClient();
  const { data: invite, error } = await admin
    .from("couple_invites")
    .delete()
    .eq("token_hash", sha256(token))
    .gt("expires_at", new Date().toISOString())
    .select("couple_id")
    .maybeSingle();
  if (error) throw error;
  if (!invite) return { error: "invalid" };

  const created = await admin.auth.admin.createUser({ ...input.data, email_confirm: true });
  if (created.error || !created.data.user) return { error: "invalid" };
  const userId = created.data.user.id;

  const { data, error: rpcError } = await admin.rpc("add_partner_b", {
    p_user_id: userId,
    p_couple_id: invite.couple_id,
  });
  if (rpcError || data === null) {
    const cleanup = await admin.auth.admin.deleteUser(userId);
    if (cleanup.error) console.error("orphan auth user", userId, cleanup.error.message);
    if (rpcError) throw new Error(`add_partner_b failed: ${rpcError.message}`);
    return { error: "invalid" };
  }

  const { error: signInError } = await (await serverClient()).auth.signInWithPassword(input.data);
  if (signInError) redirect("/login");
  return "ok";
}
