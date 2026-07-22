"use client";

import { useEffect, useState } from "react";

type ConversationSummary = { id: string; title: string; temporary: boolean; updatedAt: string };

export function ConversationSwitcher({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);

  async function load() {
    const res = await fetch("/api/chats");
    if (res.ok) setConversations(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createTemporary() {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temporary: true }),
    });
    if (!res.ok) return;
    const conv = await res.json();
    await load();
    onSelect(conv.id);
  }

  async function remove(id: string) {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (activeId === id) onSelect("general");
    load();
  }

  if (!conversations) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {conversations.map((c) => {
        const active = activeId === c.id;
        return (
          <div
            key={c.id}
            className={`shrink-0 flex items-center rounded-full ring-1 ${
              active ? "bg-slate-900 ring-slate-900" : "bg-white/75 ring-black/5"
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                active ? "text-white" : "text-slate-600"
              }`}
            >
              {c.title}
            </button>
            {c.temporary && (
              <button
                onClick={() => remove(c.id)}
                aria-label={`Delete ${c.title}`}
                className={`pr-3 pl-0.5 py-2 ${
                  active ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={createTemporary}
        className="shrink-0 flex items-center gap-1 rounded-full bg-white/75 ring-1 ring-black/5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Temporal
      </button>
    </div>
  );
}
