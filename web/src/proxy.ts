import { type NextRequest, NextResponse } from "next/server";

import { bearerToken, fail } from "@/shared/http/envelope";
import { roleOf } from "@/shared/supabase/role";
import { proxyClient } from "@/shared/supabase/server";

const PUBLIC_PAGES = ["/login", "/setup"];
// Must equal every route declared auth: "public" or "cron" (cron: withContract checks CRON_SECRET; drift pinned in proxy.test.ts).
export const PUBLIC_API = [
  "/api/health",
  "/api/session",
  "/api/session/refresh",
  "/api/pairing",
  "/api/theme",
  "/api/cron/reminders",
];
const PUBLIC = new Set([...PUBLIC_PAGES, ...PUBLIC_API]);

// Single guard: a valid JWT is not enough, the server-set role claim must be present.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next({ request: req });
  const api = pathname.startsWith("/api/");
  // Bearer for Android; without it getClaims reads the cookie session (web UI).
  const token = api ? bearerToken(req) : undefined;
  const { sb, respond } = proxyClient(req);
  const { data } = await sb.auth.getClaims(token);
  if (roleOf(data?.claims)) return respond(NextResponse.next({ request: req }));
  if (api) return fail(401, "unauthorized", "unauthorized");
  return respond(NextResponse.redirect(new URL("/login", req.url)));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
