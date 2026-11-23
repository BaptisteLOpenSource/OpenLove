import { getPushConfig } from "@/features/notifications/server/pushTokens";
import { pushConfig } from "@/shared/contracts/push";
import { withContract } from "@/shared/http/withContract";

export const GET = withContract({ output: pushConfig, auth: "partner" }, getPushConfig);
