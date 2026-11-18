import { setMood } from "@/features/home/server/getHome";
import { homeResponse, setMoodInput } from "@/shared/contracts/home";
import { withContract } from "@/shared/http/withContract";

export const POST = withContract(
  { input: setMoodInput, output: homeResponse, auth: "partner" },
  ({ mood }, { partner, sb }) => setMood(sb, partner, mood),
);
