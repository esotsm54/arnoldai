"use client";

import { useState } from "react";
import {
  Modal,
  Field,
  inputClass,
  primaryButtonClass,
  ghostButtonClass,
} from "@/components/ui";
import type { ExerciseEntry } from "./types";
import { toNum } from "./types";

export function ExerciseFormModal({
  initial,
  defaultDate,
  onClose,
  onSaved,
}: {
  initial?: ExerciseEntry;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    date: initial?.date ?? defaultDate,
    name: initial?.name ?? "",
    durationMinutes: initial ? String(initial.durationMinutes) : "",
    caloriesBurned: initial ? String(toNum(initial.caloriesBurned)) : "",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof f, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const duration = parseInt(f.durationMinutes, 10);
    const calories = parseFloat(f.caloriesBurned);
    if (!f.date || !f.name.trim() || Number.isNaN(duration) || Number.isNaN(calories)) {
      setError("Fill in date, name, duration and calories.");
      return;
    }
    const payload: Record<string, unknown> = {
      date: f.date,
      name: f.name.trim(),
      durationMinutes: duration,
      caloriesBurned: calories,
    };
    if (f.notes.trim()) payload.notes = f.notes.trim();
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/arnold/exercise/${initial.id}` : "/api/arnold/exercise",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Edit exercise" : "Add exercise"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name">
          <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Caminata + trotada intervalos" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" className="col-span-3 sm:col-span-1">
            <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" step="1" min="1" value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Calories burned">
            <input type="number" step="any" min="0" value={f.caloriesBurned} onChange={(e) => set("caloriesBurned", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Net conservative estimate." />
        </Field>
        <p className="text-xs text-slate-400">
          Log net/active calories, not gross watch calories.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add exercise"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
