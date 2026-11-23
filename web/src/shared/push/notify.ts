export type PushPayload = { title: string; body: string; url: string; tag: string };

// shortcut: stub, replaced by #23 notify on merge
export async function notify(_recipientUserId: string, _payload: PushPayload): Promise<void> {}
