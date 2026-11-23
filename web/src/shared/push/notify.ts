import "server-only";
import { createSign } from "node:crypto";

import { env, firebaseConfigured } from "@/shared/env";
import { adminClient } from "@/shared/supabase/server";

export type PushPayload = { title: string; body: string; url: string; tag: string };

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const OAUTH_URL = "https://oauth2.googleapis.com/token";
const RETRY_DELAYS_MS = [200, 500];
const TRANSIENT = new Set(["INTERNAL", "UNAVAILABLE", "internal-error", "server-unavailable"]);

type Account = { project_id: string; client_email: string; private_key: string };
type TokenRow = { token: string; platform: string };
type Outcome = "sent" | "retry" | "prune" | "drop";

let cached: { token: string; expiresAt: number } | undefined;

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

async function accessToken(account: Account): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: SCOPE,
    aud: OAUTH_URL,
    iat: now,
    exp: now + 3600,
  };
  const head = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify(claims),
  )}`;
  const sig = createSign("RSA-SHA256").update(head).sign(account.private_key);
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cached.token;
}

async function classify(res: Response): Promise<Outcome> {
  if (res.ok) return "sent";
  const body = (await res.json().catch(() => ({}))) as {
    error?: { status?: string; message?: string; details?: { errorCode?: string }[] };
  };
  const codes = [body.error?.status, ...(body.error?.details ?? []).map((d) => d.errorCode)];
  if (res.status === 404 || res.status === 410 || codes.includes("UNREGISTERED")) return "prune";
  if (res.status === 400 && /registration token/i.test(body.error?.message ?? "")) return "prune";
  if (res.status === 401) cached = undefined;
  if (res.status === 429 || res.status >= 500 || codes.some((c) => c && TRANSIENT.has(c))) {
    return "retry";
  }
  return "drop";
}

async function sendOne(
  account: Account,
  { token, platform }: TokenRow,
  p: PushPayload,
  bearer: string,
): Promise<Outcome> {
  // Android: data-only so the app service always builds the notification.
  const message =
    platform === "android"
      ? {
          token,
          data: { url: p.url, tag: p.tag, title: p.title, body: p.body },
          android: { priority: "HIGH", collapse_key: p.tag },
        }
      : {
          token,
          notification: { title: p.title, body: p.body },
          data: { url: p.url, tag: p.tag },
          webpush: { notification: { tag: p.tag } },
        };
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  return classify(res);
}

async function deliver(account: Account, row: TokenRow, p: PushPayload) {
  for (let attempt = 0; ; attempt++) {
    const outcome = await accessToken(account)
      .then((bearer) => sendOne(account, row, p, bearer))
      .catch((): Outcome => "retry");
    const delay = RETRY_DELAYS_MS[attempt];
    if (outcome === "retry" && delay !== undefined) {
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (outcome === "prune")
      await adminClient().from("push_tokens").delete().eq("token", row.token);
    if (outcome === "retry" || outcome === "drop") console.error(`push: gave up (${outcome})`);
    return;
  }
}

// Push failure never fails the caller: everything is logged and swallowed.
export async function notify(recipientUserId: string, payload: PushPayload): Promise<void> {
  try {
    if (!firebaseConfigured()) return;
    const account = JSON.parse(
      Buffer.from(env().FIREBASE_SERVICE_ACCOUNT!, "base64").toString("utf8"),
    ) as Account;
    const { data, error } = await adminClient()
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", recipientUserId);
    if (error) throw error;
    await Promise.all(data.map((row) => deliver(account, row, payload)));
  } catch (err) {
    console.error("push: notify failed", err instanceof Error ? err.message : err);
  }
}
