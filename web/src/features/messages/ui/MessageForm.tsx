import { useTranslations } from "next-intl";

export function MessageForm({
  onSend,
  onTyping,
}: {
  onSend: (text: string) => Promise<boolean>;
  onTyping: () => void;
}) {
  const t = useTranslations("messages");
  return (
    <form
      className="flex w-full max-w-md gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const text = (new FormData(form).get("text") as string | null)?.trim() ?? "";
        if (text && (await onSend(text))) form.reset();
      }}
    >
      <input
        name="text"
        required
        maxLength={4000}
        autoComplete="off"
        onChange={onTyping}
        aria-label={t("placeholder")}
        placeholder={t("placeholder")}
        className="flex-1 rounded-full border px-4 py-2"
      />
      <button type="submit" className="rounded-full border px-4 py-2">
        {t("send")}
      </button>
    </form>
  );
}
