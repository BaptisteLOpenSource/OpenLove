import type { Reveal } from "@/shared/contracts/reveals";

export type RevealRow = {
  id: number;
  kind: Reveal["kind"];
  author_id: string;
  reveal_at: string;
  title: string | null;
  body: string | null;
};

export function toReveal(r: RevealRow, me: string, now: Date): Reveal {
  const revealAt = new Date(r.reveal_at);
  const locked = revealAt > now;
  const hide = locked && r.author_id !== me;
  return {
    id: String(r.id),
    kind: r.kind,
    authorId: r.author_id,
    revealAt: revealAt.toISOString(),
    locked,
    title: hide ? null : r.title,
    body: hide ? null : r.body,
  };
}

export function sortReveals(items: Reveal[]): Reveal[] {
  const at = (r: Reveal) => Date.parse(r.revealAt);
  const revealed = items.filter((r) => !r.locked).toSorted((a, b) => at(b) - at(a));
  const locked = items.filter((r) => r.locked).toSorted((a, b) => at(a) - at(b));
  return [...revealed, ...locked];
}
