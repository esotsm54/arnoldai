"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto rounded-2xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-4 min-h-24">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">Ask Arnold something…</p>
        )}
        {messages.map((m, i) => (
          <p key={i} className="text-sm whitespace-pre-wrap">
            <span className="font-semibold">
              {m.role === "user" ? "You: " : "Arnold: "}
            </span>
            {m.content}
          </p>
        ))}
        {busy && <p className="text-sm text-slate-400">Thinking…</p>}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-full bg-white/80 ring-1 ring-black/10 px-4 py-2 text-sm outline-none focus:ring-slate-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
