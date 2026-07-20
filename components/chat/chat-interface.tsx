"use client";

import { useEffect, useRef, useState } from "react";

// Mock UI for the future OpenAI reasoning-model integration: assistant turns
// are a sequence of parts (thinking, actions, text) like a streamed response.
type Part =
  | { type: "thinking"; text: string }
  | { type: "action"; label: string }
  | { type: "text"; text: string };

type Message =
  | { role: "user"; text: string; attachments?: string[] }
  | { role: "assistant"; parts: Part[]; pending?: boolean };

const SEED: Message[] = [
  { role: "user", text: "Add 3 tortillas to my lunch today" },
  {
    role: "assistant",
    parts: [
      {
        type: "thinking",
        text: "The user wants to log food. I should search the food library for the tortillas, then scale the saved values: 1 tortilla = 25 g, so 3 tortillas = 75 g. Factor = 75 / 100 = 0.75 of the base values.",
      },
      { type: "action", label: "Searching food library" },
      { type: "action", label: "Calculating macros (75 g × 0.75)" },
      { type: "action", label: "Adding to diary — lunch" },
      {
        type: "text",
        text: "Done! I logged 3 Tortillas de almendra Palamano (75 g) to today's lunch: 245 kcal, 6.3 g protein, 16.2 g fat, 18.3 g carbs.",
      },
    ],
  },
  { role: "user", text: "How am I doing today?" },
  {
    role: "assistant",
    parts: [
      {
        type: "thinking",
        text: "I need today's food log and exercise, then the deficit: TDEE 2730 + burned − eaten.",
      },
      { type: "action", label: "Reading today's diary" },
      {
        type: "text",
        text: "You're at 848 kcal eaten with no exercise logged yet, so your running deficit is 1882 kcal. Plenty of room for dinner — around 1400 kcal keeps you on target.",
      },
    ],
  },
];

const ATTACH_OPTIONS = [
  { id: "image", label: "Image", accept: "image/*", capture: false },
  {
    id: "document",
    label: "Document",
    accept: ".pdf,.doc,.docx,.txt,.csv",
    capture: false,
  },
  { id: "camera", label: "Camera", accept: "image/*", capture: true },
] as const;

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 animate-spin">
      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
      <path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AssistantParts({ msg }: { msg: Extract<Message, { role: "assistant" }> }) {
  return (
    <div className="flex flex-col items-start gap-2 max-w-[85%]">
      {msg.parts.map((part, i) => {
        if (part.type === "thinking") {
          return (
            <details key={i} className="group rounded-xl bg-slate-100/80 px-3 py-2 text-xs text-slate-500">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium select-none">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
                </svg>
                Thinking
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 transition-transform group-open:rotate-90">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </summary>
              <p className="mt-1.5 italic whitespace-pre-wrap">{part.text}</p>
            </details>
          );
        }
        if (part.type === "action") {
          return (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckIcon />
              {part.label}
            </span>
          );
        }
        return (
          <div key={i} className="rounded-2xl rounded-tl-md bg-white ring-1 ring-black/5 px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">
            {part.text}
          </div>
        );
      })}
      {msg.pending && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          <SpinnerIcon />
          Thinking…
        </span>
      )}
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function updateLastAssistant(update: (msg: Extract<Message, { role: "assistant" }>) => Message) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = update(last);
      return next;
    });
  }

  // Simulates the future streamed reasoning response
  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || busy) return;
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text, attachments: attachments.length ? attachments : undefined },
      { role: "assistant", parts: [], pending: true },
    ]);
    setInput("");
    setAttachments([]);
    setMenuOpen(false);

    setTimeout(() => {
      updateLastAssistant((m) => ({
        ...m,
        parts: [
          ...m.parts,
          {
            type: "thinking",
            text: "Parsing the request and deciding which Arnold API endpoints to call…",
          },
        ],
      }));
    }, 600);
    setTimeout(() => {
      updateLastAssistant((m) => ({
        ...m,
        parts: [...m.parts, { type: "action", label: "Checking your diary" }],
      }));
    }, 1500);
    setTimeout(() => {
      updateLastAssistant((m) => ({
        ...m,
        pending: false,
        parts: [
          ...m.parts,
          {
            type: "text",
            text: "This is a mock reply — the reasoning model isn't connected yet. Your message and any attachments made it through, so the plumbing is ready.",
          },
        ],
      }));
      setBusy(false);
    }, 2600);
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const names = [...(e.target.files ?? [])].map((f) => f.name);
    if (names.length) setAttachments((prev) => [...prev, ...names]);
    e.target.value = "";
    setMenuOpen(false);
  }

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-4 flex flex-col gap-4"
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="self-end max-w-[85%] flex flex-col items-end gap-1">
              {msg.attachments?.map((name) => (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 5a3.7 3.7 0 0 1 5.2 5.2l-8.2 8.2a1.8 1.8 0 0 1-2.6-2.6L15 8.3" />
                  </svg>
                  {name}
                </span>
              ))}
              {msg.text && (
                <div className="rounded-2xl rounded-tr-md bg-slate-900 text-white px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {msg.text}
                </div>
              )}
            </div>
          ) : (
            <AssistantParts key={i} msg={msg} />
          )
        )}
      </div>

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((name, i) => (
            <span key={`${name}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-black/10 px-3 py-1.5 text-xs text-slate-700">
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-slate-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={send} className="mt-3 flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            aria-label="Attach"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/10 text-slate-600 hover:bg-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-44 rounded-2xl bg-white shadow-lg ring-1 ring-black/5 p-1.5 z-10">
              {ATTACH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => fileRefs.current[opt.id]?.click()}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left"
                >
                  {opt.id === "image" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5 shrink-0">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="9" cy="10" r="1.5" />
                      <path d="M21 15l-4.5-4.5L8 19" />
                    </svg>
                  )}
                  {opt.id === "document" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5 shrink-0">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                      <path d="M14 3v5h5M9 13h6M9 17h6" />
                    </svg>
                  )}
                  {opt.id === "camera" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5 shrink-0">
                      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {ATTACH_OPTIONS.map((opt) => (
          <input
            key={opt.id}
            ref={(el) => {
              fileRefs.current[opt.id] = el;
            }}
            type="file"
            accept={opt.accept}
            {...(opt.capture ? { capture: "environment" as const } : {})}
            onChange={onFilePicked}
            className="hidden"
          />
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Arnold"
          className="h-11 flex-1 rounded-full bg-white/80 ring-1 ring-black/10 px-4 text-sm outline-none focus:ring-slate-400"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Send"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
            <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
