"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  DetailRow,
  Field,
  inputClass,
  primaryButtonClass,
  ghostButtonClass,
  num,
} from "./ui";

type Exercise = {
  id: string;
  date: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: string;
  notes: string | null;
};

type View =
  | { mode: "detail"; exercise: Exercise }
  | { mode: "edit"; exercise: Exercise }
  | { mode: "create" }
  | null;

export function ExercisesPanel() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(null);

  async function load() {
    try {
      const res = await fetch("/api/arnold/exercise");
      if (!res.ok) throw new Error("Could not load exercises");
      const data: Exercise[] = await res.json();
      data.sort((a, b) => b.date.localeCompare(a.date));
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load exercises");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={() => setView({ mode: "create" })} className={primaryButtonClass}>
          + Add exercise
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!exercises && !error && <p className="text-sm text-slate-400">Loading exercises…</p>}
      {exercises && exercises.length === 0 && (
        <p className="text-sm text-slate-400">No exercises yet. Add the first one.</p>
      )}

      {exercises && exercises.length > 0 && (
        <ul className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm divide-y divide-black/5 overflow-hidden">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <button
                onClick={() => setView({ mode: "detail", exercise: ex })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{ex.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {ex.date} · {ex.durationMinutes} min · {num(ex.caloriesBurned)} kcal
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-slate-400">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {view?.mode === "detail" && (
        <Modal title={view.exercise.name} onClose={() => setView(null)}>
          <div>
            <DetailRow label="Date" value={view.exercise.date} />
            <DetailRow label="Duration" value={`${view.exercise.durationMinutes} min`} />
            <DetailRow label="Calories burned" value={`${num(view.exercise.caloriesBurned)} kcal`} />
          </div>
          {view.exercise.notes && (
            <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{view.exercise.notes}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ mode: "edit", exercise: view.exercise })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {(view?.mode === "edit" || view?.mode === "create") && (
        <ExerciseFormModal
          initial={view.mode === "edit" ? view.exercise : undefined}
          onClose={() => setView(null)}
          onSaved={async () => {
            setView(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ExerciseFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Exercise;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
    name: initial?.name ?? "",
    durationMinutes: initial ? String(initial.durationMinutes) : "",
    caloriesBurned: initial ? String(parseFloat(initial.caloriesBurned)) : "",
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
    <Modal title={initial ? "Edit exercise" : "New exercise"} onClose={onClose}>
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
          <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Net conservative estimate." />
        </Field>
        <p className="text-xs text-slate-400">
          Log net/active calories, not gross watch calories.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create exercise"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
