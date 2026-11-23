import "server-only";
import type { z } from "zod";

import type { registerPushTokenInput } from "@/shared/contracts/push";
import { env, firebaseConfigured } from "@/shared/env";
import { ApiError } from "@/shared/http/withContract";
import { adminClient } from "@/shared/supabase/server";

const UNIQUE_VIOLATION = "23505";
const MAX_TOKENS = 10;

// Newest MAX_TOKENS stay: stale devices never get an FCM error, so nothing else prunes them.
async function pruneOldest(userId: string) {
  const sb = adminClient();
  const { data, error } = await sb
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(MAX_TOKENS, MAX_TOKENS + 999);
  if (error) throw error;
  if (!data.length) return;
  const del = await sb
    .from("push_tokens")
    .delete()
    .in(
      "token",
      data.map((r) => r.token),
    );
  if (del.error) throw del.error;
}

// Never an upsert on token: a token of the other Partenaire must not change owner (S6).
export async function registerPushToken(
  userId: string,
  { token, platform }: z.output<typeof registerPushTokenInput>,
) {
  const { error } = await adminClient()
    .from("push_tokens")
    .insert({ user_id: userId, token, platform });
  if (!error) {
    await pruneOldest(userId);
    return { registered: true as const };
  }
  if (error.code !== UNIQUE_VIOLATION) throw error;
  const { data, error: readError } = await adminClient()
    .from("push_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (readError) throw readError;
  if (data?.user_id !== userId) throw new ApiError(403, "forbidden", "token owned by another user");
  return { registered: true as const };
}

export function getPushConfig() {
  if (!firebaseConfigured()) throw new ApiError(404, "not_found", "push not configured");
  const e = env();
  return {
    projectId: e.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    apiKey: e.NEXT_PUBLIC_FIREBASE_API_KEY!,
    messagingSenderId: e.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    androidAppId: e.FIREBASE_ANDROID_APP_ID!,
  };
}
