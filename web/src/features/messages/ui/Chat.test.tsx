// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Chat } from "./Chat";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

// no Realtime in jsdom: channel is inert
const { realtime } = vi.hoisted(() => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    send: async () => "ok",
  };
  return { realtime: { channel, removeChannel: async () => "ok" } };
});
vi.mock("@/shared/supabase/browser", () => ({
  browserClient: () => ({
    channel: () => realtime.channel,
    removeChannel: realtime.removeChannel,
  }),
}));

const m = (id: string, body: string) => ({
  id,
  authorId: "me",
  body,
  createdAt: "2026-10-30T10:00:00.000Z",
});

const json = (data: unknown, status = 200) => Response.json({ data }, { status });

// mount syncs read + newest page: answer those, let each test answer the rest
function fetchRouter(extra: (url: string, init?: RequestInit) => Response | undefined) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const hit = extra(url, init);
    if (hit) return hit;
    if (url === "/api/messages/read") return json({ lastReadId: null });
    return json({ items: [], nextCursor: null, partnerReadId: null });
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("load older fetches the cursor page and renders it above", async () => {
  const fetchMock = fetchRouter((url) =>
    url.startsWith("/api/messages?cursor=")
      ? json({ items: [m("1", "older")], nextCursor: null, partnerReadId: null })
      : undefined,
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <Chat
      initial={{ items: [m("2", "newer")], nextCursor: "2", partnerReadId: null }}
      me="me"
      coupleId="c"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "loadOlder" }));

  await waitFor(() => expect(screen.queryByRole("button", { name: "loadOlder" })).toBeNull());
  expect(fetchMock).toHaveBeenCalledWith("/api/messages?cursor=2", undefined);
  const bodies = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(bodies).toEqual(["older", "newer"]);
});

test("Vu sits under the last own Message the partner has read", () => {
  vi.stubGlobal(
    "fetch",
    fetchRouter(() => undefined),
  );
  const own = (id: string) => ({ ...m(id, id), authorId: "me" });
  render(
    <Chat
      initial={{ items: [own("1"), own("2"), own("3")], nextCursor: null, partnerReadId: "2" }}
      me="me"
      coupleId="c"
    />,
  );
  expect(screen.getAllByText("seen")).toHaveLength(1);
  expect(screen.getByText("seen").closest("li")?.textContent).toContain("2");
});

test("send posts the text and appends the returned Message", async () => {
  const fetchMock = fetchRouter((url, init) =>
    init?.method === "POST" && url === "/api/messages" ? json(m("3", "hi")) : undefined,
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <Chat initial={{ items: [], nextCursor: null, partnerReadId: null }} me="me" coupleId="c" />,
  );

  fireEvent.change(screen.getByRole("textbox", { name: "placeholder" }), {
    target: { value: "hi" },
  });
  fireEvent.submit(screen.getByRole("textbox", { name: "placeholder" }).closest("form")!);

  await waitFor(() => expect(screen.getByText("hi")).toBeTruthy());
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/messages",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ text: "hi" }) }),
  );
});
