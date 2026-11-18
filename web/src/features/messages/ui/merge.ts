import type { z } from "zod";

import type { message } from "@/shared/contracts/messages";

export type Message = z.input<typeof message>;

// Vu sits under the last own Message the other Partenaire has read
export function seenId(items: Message[], me: string, partnerReadId: string | null): string | null {
  if (!partnerReadId) return null;
  const read = BigInt(partnerReadId);
  let found: string | null = null;
  for (const m of items) if (m.authorId === me && BigInt(m.id) <= read) found = m.id;
  return found;
}

// ids are bigint strings: compare numerically, never as text ("10" < "9")
export function mergeMessages(a: Message[], b: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of [...a, ...b]) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) => (BigInt(x.id) < BigInt(y.id) ? -1 : 1));
}
