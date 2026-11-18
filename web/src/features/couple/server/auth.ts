"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clientIp } from "@/shared/http/clientIp";
import { roleOf } from "@/shared/supabase/role";
import { serverClient } from "@/shared/supabase/server";

import { LOGIN_FLOOR_MS, LOGIN_LIMIT } from "../domain/limits";
import { atLeast } from "./atLeast";
import { hitRateLimit } from "./rateLimit";

export type LoginState = { error?: "invalid" | "rate_limited" };

const credentials = z.object({ email: z.email(), password: z.string().min(1) });

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const result = await atLeast(LOGIN_FLOOR_MS, () => attempt(form));
  if (result !== "ok") return result;
  redirect("/");
}

async function attempt(form: FormData): Promise<LoginState | "ok"> {
  const input = credentials.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const allowed = await hitRateLimit(
    `login:${clientIp(await headers())}`,
    LOGIN_LIMIT.max,
    LOGIN_LIMIT.windowSeconds,
  );
  if (!allowed) return { error: "rate_limited" };
  const sb = await serverClient();
  const { data, error } = await sb.auth.signInWithPassword(input.data);
  if (error) return { error: "invalid" };
  // Same answer as a wrong password: an account without role is not a signal to reveal.
  if (!roleOf(data.user)) {
    await sb.auth.signOut();
    return { error: "invalid" };
  }
  return "ok";
}

export async function signOut(): Promise<never> {
  await (await serverClient()).auth.signOut();
  redirect("/login");
}
