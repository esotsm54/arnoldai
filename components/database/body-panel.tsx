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
} from "@/components/ui";

type BodyEntry = {
  id: string;
  day: string;
  weightKg: string | null;
  fatPercentage: string | null;
  waistCm: string | null;
  hipsCm: string | null;
  chestCm: string | null;
  leftArmCm: string | null;
  rightArmCm: string | null;
  leftThighCm: string | null;
  rightThighCm: string | null;
};

const MEASUREMENTS: { key: keyof BodyEntry; label: string; unit: string }[] = [
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "fatPercentage", label: "Body fat", unit: "%" },
  { key: "waistCm", label: "Waist", unit: "cm" },
  { key: "hipsCm", label: "Hips", unit: "cm" },
  { key: "chestCm", label: "Chest", unit: "cm" },
  { key: "leftArmCm", label: "Left arm", unit: "cm" },
  { key: "rightArmCm", label: "Right arm", unit: "cm" },
  { key: "leftThighCm", label: "Left thigh", unit: "cm" },
  { key: "rightThighCm", label: "Right thigh", unit: "cm" },
];

type View =
  | { mode: "detail"; entry: BodyEntry }
  | { mode: "edit"; entry: BodyEntry }
  | { mode: "create" }
  | null;

export function BodyPanel() {
  const [entries, setEntries] = useState<BodyEntry[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(null);

  async function load() {
    try {
      const res = await fetch("/api/arnold/body");
      if (!res.ok) throw new Error("Could not load weight entries");
      const data: BodyEntry[] = await res.json();
      data.sort((a, b) => b.day.localeCompare(a.day));
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load weight entries");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={() => setView({ mode: "create" })} className={primaryButtonClass}>
          + Add entry
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!entries && !error && <p className="text-sm text-slate-400">Loading entries…</p>}
      {entries && entries.length === 0 && (
        <p className="text-sm text-slate-400">No entries yet. Add the first one.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm divide-y divide-black/5 overflow-hidden">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => setView({ mode: "detail", entry })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{entry.day}</p>
                  <p className="text-xs text-slate-500">
                    {entry.weightKg ? `${num(entry.weightKg)} kg` : "no weight"}
                    {entry.fatPercentage ? ` · ${num(entry.fatPercentage)}% fat` : ""}
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
        <Modal title={view.entry.day} onClose={() => setView(null)}>
          <div>
            {MEASUREMENTS.map(({ key, label, unit }) => (
              <DetailRow
                key={key}
                label={label}
                value={
                  view.entry[key] !== null && view.entry[key] !== ""
                    ? `${num(view.entry[key] as string)} ${unit}`
                    : "—"
                }
              />
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ mode: "edit", entry: view.entry })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {(view?.mode === "edit" || view?.mode === "create") && (
        <BodyFormModal
          initial={view.mode === "edit" ? view.entry : undefined}
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

function BodyFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: BodyEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  })();

  const [day, setDay] = useState(initial?.day ?? today);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const { key } of MEASUREMENTS) {
      const raw = initial?.[key];
      v[key] = raw === null || raw === undefined ? "" : String(parseFloat(raw));
    }
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!day) {
      setError("Pick a day.");
      return;
    }
    const payload: Record<string, unknown> = { day };
    for (const { key } of MEASUREMENTS) {
      if (values[key] !== "") {
        const n = parseFloat(values[key]);
        if (Number.isNaN(n)) {
          setError("Measurements must be numbers.");
          return;
        }
        payload[key] = n;
      }
    }
    if (Object.keys(payload).length === 1) {
      setError("Fill in at least one measurement.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/arnold/body/${initial.id}` : "/api/arnold/body",
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
    <Modal title={initial ? "Edit entry" : "New weight entry"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Day">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENTS.map(({ key, label, unit }) => (
            <Field key={key} label={`${label} (${unit})`}>
              <input
                type="number"
                step="any"
                min="0"
                value={values[key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Only the day is required — fill in whatever you measured.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add entry"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
