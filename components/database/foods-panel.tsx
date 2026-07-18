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

type Food = {
  id: string;
  name: string;
  calories: string;
  baseAmount: string;
  baseUnit: string;
  portionAmount: string;
  portionUnit: string;
  portionDescription: string;
  protein: string | null;
  fat: string | null;
  carbohydrates: string | null;
  sodium: string | null;
};

type View =
  | { mode: "detail"; food: Food }
  | { mode: "edit"; food: Food }
  | { mode: "create" }
  | null;

export function FoodsPanel() {
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(null);

  async function load() {
    try {
      const res = await fetch("/api/arnold/foods");
      if (!res.ok) throw new Error("Could not load foods");
      const data: Food[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load foods");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={() => setView({ mode: "create" })} className={primaryButtonClass}>
          + Add food
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!foods && !error && <p className="text-sm text-slate-400">Loading foods…</p>}
      {foods && foods.length === 0 && (
        <p className="text-sm text-slate-400">No foods yet. Add the first one.</p>
      )}

      {foods && foods.length > 0 && (
        <ul className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm divide-y divide-black/5 overflow-hidden">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setView({ mode: "detail", food: f })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {num(f.calories)} kcal / {num(f.baseAmount)} {f.baseUnit}
                    {f.portionDescription ? ` · ${f.portionDescription}` : ""}
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
        <Modal title={view.food.name} onClose={() => setView(null)}>
          <div>
            <DetailRow label="Calories" value={`${num(view.food.calories)} kcal / ${num(view.food.baseAmount)} ${view.food.baseUnit}`} />
            <DetailRow label="Usual portion" value={`${num(view.food.portionAmount)} ${view.food.portionUnit} — ${view.food.portionDescription}`} />
            <DetailRow label="Protein" value={`${num(view.food.protein)} g`} />
            <DetailRow label="Fat" value={`${num(view.food.fat)} g`} />
            <DetailRow label="Carbohydrates" value={`${num(view.food.carbohydrates)} g`} />
            <DetailRow label="Sodium" value={`${num(view.food.sodium)} mg`} />
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ mode: "edit", food: view.food })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {(view?.mode === "edit" || view?.mode === "create") && (
        <FoodFormModal
          initial={view.mode === "edit" ? view.food : undefined}
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

function FoodFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Food;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    calories: num0(initial?.calories),
    baseAmount: initial ? num0(initial.baseAmount) : "100",
    baseUnit: initial?.baseUnit ?? "g",
    portionAmount: num0(initial?.portionAmount),
    portionUnit: initial?.portionUnit ?? "g",
    portionDescription: initial?.portionDescription ?? "",
    protein: num0(initial?.protein),
    fat: num0(initial?.fat),
    carbohydrates: num0(initial?.carbohydrates),
    sodium: num0(initial?.sodium),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof f, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const required = {
      calories: parseFloat(f.calories),
      baseAmount: parseFloat(f.baseAmount),
      portionAmount: parseFloat(f.portionAmount),
    };
    if (
      !f.name.trim() ||
      !f.baseUnit.trim() ||
      !f.portionUnit.trim() ||
      !f.portionDescription.trim() ||
      Object.values(required).some((n) => Number.isNaN(n))
    ) {
      setError("Fill in all fields except the optional macros.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      calories: required.calories,
      baseAmount: required.baseAmount,
      baseUnit: f.baseUnit.trim(),
      portionAmount: required.portionAmount,
      portionUnit: f.portionUnit.trim(),
      portionDescription: f.portionDescription.trim(),
    };
    for (const key of ["protein", "fat", "carbohydrates", "sodium"] as const) {
      if (f[key] !== "") payload[key] = parseFloat(f[key]);
    }
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/arnold/foods/${initial.id}` : "/api/arnold/foods",
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
    <Modal title={initial ? "Edit food" : "New food"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name">
          <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Queso holandés Alpina" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Calories">
            <input type="number" step="any" value={f.calories} onChange={(e) => set("calories", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Base amount">
            <input type="number" step="any" value={f.baseAmount} onChange={(e) => set("baseAmount", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Base unit">
            <input value={f.baseUnit} onChange={(e) => set("baseUnit", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Portion amount">
            <input type="number" step="any" value={f.portionAmount} onChange={(e) => set("portionAmount", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Portion unit">
            <input value={f.portionUnit} onChange={(e) => set("portionUnit", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Portion description">
          <input value={f.portionDescription} onChange={(e) => set("portionDescription", e.target.value)} className={inputClass} placeholder="1 tajada" />
        </Field>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Protein (g)">
            <input type="number" step="any" value={f.protein} onChange={(e) => set("protein", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fat (g)">
            <input type="number" step="any" value={f.fat} onChange={(e) => set("fat", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Carbs (g)">
            <input type="number" step="any" value={f.carbohydrates} onChange={(e) => set("carbohydrates", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Sodium (mg)">
            <input type="number" step="any" value={f.sodium} onChange={(e) => set("sodium", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <p className="text-xs text-slate-400">
          Values are per base amount (usually 100 g). Macros are optional.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create food"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// "374.00" -> "374" for form inputs; empty for null/undefined
function num0(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = parseFloat(value);
  return Number.isNaN(n) ? "" : String(n);
}
