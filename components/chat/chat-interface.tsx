"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "./markdown";

// Assistant turns are a sequence of parts (thinking, actions, text) as
// streamed live from /api/ai/chat — thinking is the model's real reasoning
// summary and actions are real read-only tool calls against the Arnold API.
type Part =
  | { type: "thinking"; text: string }
  | { type: "action"; label: string }
  | { type: "text"; text: string };

// dataUrl is a small thumbnail (displayed + persisted); sendUrl is the larger
// compressed version sent to the model, kept only in memory for this session
// (stripped before saving so Redis writes stay under Upstash's request cap).
type Attachment = { name: string; kind: "image" | "document"; dataUrl?: string; sendUrl?: string };

type Message =
  | { role: "user"; text: string; attachments?: Attachment[] }
  | { role: "assistant"; parts: Part[]; pending?: boolean };

// Images are sent to the model as input_image parts; documents are still
// just a visual chip for now — their contents aren't read or transmitted.
function buildContent(text: string, attachments?: Attachment[]) {
  const images = (attachments ?? []).filter((a) => a.kind === "image" && (a.sendUrl || a.dataUrl));
  if (images.length === 0) return text;
  return [
    { type: "input_text", text },
    ...images.map((img) => ({
      type: "input_image",
      image_url: img.sendUrl ?? img.dataUrl,
      detail: "auto",
    })),
  ];
}

// Phone photos are several MB; base64 grows them past Vercel's 4.5 MB request
// cap (observed as 413 FUNCTION_PAYLOAD_TOO_LARGE). Downscale + re-encode as
// JPEG in the browser before anything leaves the device.
async function compressImage(file: File): Promise<{ sendUrl: string; thumbUrl: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scaleTo = (maxEdge: number, quality: number) => {
    const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  };
  const result = { sendUrl: scaleTo(1024, 0.8), thumbUrl: scaleTo(320, 0.75) };
  bitmap.close();
  return result;
}

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
          <div key={i} className="max-w-full rounded-2xl rounded-tl-md bg-white ring-1 ring-black/5 px-4 py-2.5 text-sm text-slate-800">
            <Markdown text={part.text} />
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

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const justLoadedRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Load this conversation's history from the server — it's stored there
  // (not per-browser) so it's the same conversation from any device.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chats/${conversationId}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((conv) => {
        if (cancelled) return;
        justLoadedRef.current = true;
        setMessages(conv.messages ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Persist once a turn has settled — not on the initial load, not mid-stream.
  // Full-size images (sendUrl) are stripped: only the small thumbnail is stored,
  // keeping each save well under Upstash's per-request size cap.
  useEffect(() => {
    if (loading || busy) return;
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    const persistable = messages.map((m) =>
      m.role === "user" && m.attachments
        ? {
            ...m,
            attachments: m.attachments.map((a) => ({
              name: a.name,
              kind: a.kind,
              dataUrl: a.dataUrl,
            })),
          }
        : m
    );
    fetch(`/api/chats/${conversationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: persistable }),
    }).catch(() => {});
  }, [messages, busy, loading, conversationId]);

  function updateLastAssistant(update: (msg: Extract<Message, { role: "assistant" }>) => Message) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = update(last);
      return next;
    });
  }

  function appendToPart(kind: "thinking" | "text", text: string) {
    updateLastAssistant((m) => {
      const parts = [...m.parts];
      const last = parts[parts.length - 1];
      if (last?.type === kind) {
        parts[parts.length - 1] = { ...last, text: last.text + text };
      } else {
        parts.push({ type: kind, text });
      }
      return { ...m, parts };
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || busy) return;
    setBusy(true);

    const currentAttachments = attachments;
    // Only the most recent prior user message keeps its images when replaying
    // history — older ones become text-only so the payload can't grow past
    // Vercel's request size limit as the conversation accumulates photos.
    const lastUserIdx = messages.reduce(
      (last, m, i) => (m.role === "user" ? i : last),
      -1
    );
    const apiHistory = messages.map((m, i) =>
      m.role === "user"
        ? {
            role: "user" as const,
            content:
              i === lastUserIdx
                ? buildContent(m.text, m.attachments)
                : buildContent(
                    m.attachments?.some((a) => a.kind === "image")
                      ? `${m.text}\n[el usuario adjuntó una imagen en este mensaje; ya no está disponible]`
                      : m.text
                  ),
          }
        : {
            role: "assistant" as const,
            content: m.parts
              .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
              .map((p) => p.text)
              .join("\n\n"),
          }
    );

    setMessages((prev) => [
      ...prev,
      { role: "user", text, attachments: attachments.length ? attachments : undefined },
      { role: "assistant", parts: [], pending: true },
    ]);
    setInput("");
    setAttachments([]);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...apiHistory,
            { role: "user", content: buildContent(text, currentAttachments) },
          ],
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "thinking_delta") appendToPart("thinking", event.text);
          else if (event.type === "text_delta") appendToPart("text", event.text);
          else if (event.type === "action") {
            updateLastAssistant((m) => ({
              ...m,
              parts: [...m.parts, { type: "action", label: event.label }],
            }));
          } else if (event.type === "error") {
            updateLastAssistant((m) => ({
              ...m,
              parts: [...m.parts, { type: "text", text: `⚠️ ${event.message}` }],
            }));
          }
        }
      }
    } catch (err) {
      updateLastAssistant((m) => ({
        ...m,
        parts: [
          ...m.parts,
          { type: "text", text: `⚠️ ${err instanceof Error ? err.message : "Request failed"}` },
        ],
      }));
    } finally {
      updateLastAssistant((m) => ({ ...m, pending: false }));
      setBusy(false);
    }
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    setMenuOpen(false);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          const { sendUrl, thumbUrl } = await compressImage(file);
          setAttachments((prev) => [
            ...prev,
            { name: file.name, kind: "image", dataUrl: thumbUrl, sendUrl },
          ]);
        } catch {
          setAttachments((prev) => [
            ...prev,
            { name: `${file.name} (no se pudo procesar)`, kind: "document" },
          ]);
        }
      } else {
        setAttachments((prev) => [...prev, { name: file.name, kind: "document" }]);
      }
    }
  }

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-4 flex flex-col gap-4"
      >
        {loading && <p className="m-auto text-sm text-slate-400">Loading conversation…</p>}
        {!loading && messages.length === 0 && (
          <p className="m-auto text-sm text-slate-400">Ask Arnold something…</p>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="self-end max-w-[85%] flex flex-col items-end gap-1">
              {msg.attachments?.map((att, idx) =>
                att.kind === "image" && att.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL preview, not an optimizable asset
                  <img
                    key={idx}
                    src={att.dataUrl}
                    alt={att.name}
                    className="max-h-40 max-w-[200px] rounded-2xl object-cover ring-1 ring-black/10"
                  />
                ) : (
                  <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 5a3.7 3.7 0 0 1 5.2 5.2l-8.2 8.2a1.8 1.8 0 0 1-2.6-2.6L15 8.3" />
                    </svg>
                    {att.name}
                  </span>
                )
              )}
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
          {attachments.map((att, i) => (
            <span key={`${att.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-black/10 pl-1.5 pr-3 py-1.5 text-xs text-slate-700">
              {att.kind === "image" && att.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL preview, not an optimizable asset
                <img src={att.dataUrl} alt={att.name} className="h-6 w-6 rounded-full object-cover" />
              ) : null}
              {att.name}
              <button
                type="button"
                aria-label={`Remove ${att.name}`}
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
