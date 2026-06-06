"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({ bountyId }: { bountyId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your networking agent. Ask me about this task, what I've spent, or who I've reached out to.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  };

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    scrollToBottom();
    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, bountyId, history }),
      }).then((x) => x.json());
      setMessages((m) => [
        ...m,
        { role: "assistant", content: r.reply ?? "(no reply)" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't reach the agent." },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div className="panel flex h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h3 className="font-semibold">Chat with the agent</h3>
        <span className="text-xs text-[var(--muted-2)]">text</span>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-[#04101f]"
                  : "bg-[var(--bg-soft)] text-[var(--text)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--muted)]">
              thinking…
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
        <input
          className="input"
          placeholder="Ask your agent…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <button className="btn btn-primary" onClick={() => void send()} disabled={sending}>
          Send
        </button>
      </div>
    </div>
  );
}
