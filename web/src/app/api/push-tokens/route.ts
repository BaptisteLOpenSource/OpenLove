import { registerPushToken } from "@/features/notifications/server/pushTokens";
import { pushTokenRegistered, registerPushTokenInput } from "@/shared/contracts/push";
import { withContract } from "@/shared/http/withContract";

export const POST = withContract(
  { input: registerPushTokenInput, output: pushTokenRegistered, auth: "partner" },
  (input, { partner }) => registerPushToken(partner.userId, input),
);
