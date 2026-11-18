import { markRead } from "@/features/messages/server/messages";
import { markReadResponse } from "@/shared/contracts/messages";
import { withContract } from "@/shared/http/withContract";

export const POST = withContract({ output: markReadResponse, auth: "partner" }, (_, { sb }) =>
  markRead(sb),
);
