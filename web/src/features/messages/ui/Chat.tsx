"use client";
import { useTranslations } from "next-intl";
import type { z } from "zod";

import type { messagesResponse } from "@/shared/contracts/messages";

import { seenId } from "./merge";
import { MessageForm } from "./MessageForm";
import { MessageList } from "./MessageList";
import { useChat } from "./useChat";

export function Chat({
  initial,
  me,
  coupleId,
}: {
  initial: z.input<typeof messagesResponse>;
  me: string;
  coupleId: string;
}) {
  const t = useTranslations("messages");
  const { items, hasOlder, partnerReadId, loadOlder, send, failed, typing, onTyping } = useChat(
    initial,
    coupleId,
  );
  return (
    <>
      {hasOlder && (
        <button type="button" onClick={loadOlder} className="rounded-full border px-4 py-2">
          {t("loadOlder")}
        </button>
      )}
      <MessageList items={items} me={me} seenId={seenId(items, me, partnerReadId)} />
      {typing && <p className="text-label-small">{t("typing")}</p>}
      <MessageForm onSend={send} onTyping={onTyping} />
      {failed && <p role="alert">{t("sendFailed")}</p>}
    </>
  );
}
