"use server";
import { revalidatePath } from "next/cache";

import { createRevealInput, type RevealState } from "@/shared/contracts/reveals";
import { ApiError } from "@/shared/http/withContract";
import { partnerOf, serverClient } from "@/shared/supabase/server";

import { createReveal } from "./reveals";

export async function createRevealAction(_prev: RevealState, form: FormData): Promise<RevealState> {
  const input = createRevealInput.safeParse({
    kind: form.get("kind"),
    title: form.get("title"),
    body: form.get("body"),
    revealAt: form.get("revealAt"),
  });
  if (!input.success) return { error: "invalid" };
  const sb = await serverClient();
  const result = await partnerOf(sb);
  if (!result.ok) return { error: "failed" };
  try {
    await createReveal(result.partner, input.data, sb);
  } catch (e) {
    return {
      error: e instanceof ApiError && e.status === 400 ? "invalid" : "failed",
    };
  }
  revalidatePath("/archive");
  return { ok: true };
}
