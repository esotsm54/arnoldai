"use client";

import { useEffect, useState } from "react";

export function AssistantPromptForm() {
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/gpt-config");
        if (!res.ok) throw new Error("Could not load the assistant prompt");
        const config = await res.json();
        setInstructions(config?.instructions ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the assistant prompt");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/gpt-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setMessage("Prompt saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading prompt…</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-slate-700">
        Instructions
        <textarea
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            setMessage("");
          }}
          rows={12}
          placeholder="You are Arnold, a nutrition and fitness assistant. You have access to the user's food diary, exercise log, and food library through tools..."
          className="w-full rounded-xl bg-white/80 ring-1 ring-black/10 px-4 py-3 text-sm outline-none focus:ring-slate-400 resize-y font-mono"
        />
      </label>
      <p className="text-xs text-slate-400">
        This is the system prompt sent to the assistant on every message. The
        actions it can take (reading/writing your diary, exercise, and foods)
        are defined in code, not here.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm font-medium text-[#006300]">{message}</p>}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save prompt"}
        </button>
      </div>
    </form>
  );
}
