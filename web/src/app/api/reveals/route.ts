import { createReveal, listReveals } from "@/features/reveal/server/reveals";
import { createRevealInput, reveal, revealsResponse } from "@/shared/contracts/reveals";
import { withContract } from "@/shared/http/withContract";

export const GET = withContract(
  { output: revealsResponse, auth: "partner" },
  (_, { partner, sb }) => listReveals(partner.userId, sb),
);

export const POST = withContract(
  { input: createRevealInput, output: reveal, auth: "partner" },
  (input, { partner, sb }) => createReveal(partner, input, sb),
);
