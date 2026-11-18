import type { ErrorCode } from "@/shared/contracts/error";

export function fail(status: number, code: ErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export function bearerToken(req: Request) {
  return /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
}
