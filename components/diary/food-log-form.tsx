"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Field,
  inputClass,
  primaryButtonClass,
  ghostButtonClass,
} from "@/components/ui";
import type { Food, LogEntry } from "./types";
import { toNum } from "./types";

const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function FoodLogFormModal({
  initial,
  defaultDate,
  onClose,
  onSaved,
}: {
  initial?: LogEntry;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    date: initial?.date ?? defaultDate,
    mealType: initial?.mealType ?? "lunch",
    foodName: initial?.foodName ?? "",
    weightAmount: initial ? String(toNum(initial.weightAmount)) : "",
    weightUnit: initial?.weightUnit ?? "g",
    calories: initial ? String(toNum(initial.calories)) : "",
    protein: optStr(initial?.protein),
    fat: optStr(initial?.fat),
    carbohydrates: optStr(initial?.carbohydrates),
    sodium: optStr(initial?.sodium),
    notes: initial?.notes ?? "",
  });
  const [foods, setFoods] = useState<Food[]>([]);
  const [libId, setLibId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/arnold/foods")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Food[]) => {
        data.sort((a, b) => a.name.localeCompare(b.name));
        setFoods(data);
      })
      .catch(() => {});
  }, []);

  function set(key: keyof typeof f, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  // Scales the library food's per-base values to the eaten amount (docs §6)
  function applyLibrary(id: string, amountStr?: string) {
    const food = foods.find((x) => x.id === id);
    if (!food) return;
    const amount = toNum(amountStr ?? "") || toNum(food.portionAmount);
    const factor = amount / toNum(food.baseAmount);
    setF((prev) => ({
      ...prev,
      foodName: food.name,
      weightAmount: String(amount),
      weightUnit: food.baseUnit,
      calories: String(round1(toNum(food.calories) * factor)),
      protein: food.protein === null ? "" : String(round1(toNum(food.protein) * factor)),
      fat: food.fat === null ? "" : String(round1(toNum(food.fat) * factor)),
      carbohydrates:
        food.carbohydrates === null ? "" : String(round1(toNum(food.carbohydrates) * factor)),
      sodium: food.sodium === null ? "" : String(round1(toNum(food.sodium) * factor)),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const weight = parseFloat(f.weightAmount);
    const calories = parseFloat(f.calories);
    if (
      !f.date ||
      !f.foodName.trim() ||
      !f.weightUnit.trim() ||
      Number.isNaN(weight) ||
      Number.isNaN(calories)
    ) {
      setError("Fill in date, food name, amount, unit and calories.");
      return;
    }
    const payload: Record<string, unknown> = {
      date: f.date,
      mealType: f.mealType,
      foodName: f.foodName.trim(),
      weightAmount: weight,
      weightUnit: f.weightUnit.trim(),
      calories,
    };
    for (const key of ["protein", "fat", "carbohydrates", "sodium"] as const) {
      if (f[key] !== "") payload[key] = parseFloat(f[key]);
    }
    if (f.notes.trim()) payload.notes = f.notes.trim();
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/arnold/log/${initial.id}` : "/api/arnold/log",
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
    <Modal title={initial ? "Edit food entry" : "Add food"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {foods.length > 0 && (
          <Field label="Prefill from food library (optional)">
            <select
              value={libId}
              onChange={(e) => {
                setLibId(e.target.value);
                if (e.target.value) applyLibrary(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">— Manual entry —</option>
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Meal">
            <select value={f.mealType} onChange={(e) => set("mealType", e.target.value)} className={inputClass}>
              {MEALS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Food name">
          <input value={f.foodName} onChange={(e) => set("foodName", e.target.value)} className={inputClass} placeholder="Tortillas de almendra Palamano" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Amount">
            <input
              type="number"
              step="any"
              min="0"
              value={f.weightAmount}
              onChange={(e) => {
                set("weightAmount", e.target.value);
                if (libId) applyLibrary(libId, e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Unit">
            <input value={f.weightUnit} onChange={(e) => set("weightUnit", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Calories">
            <input type="number" step="any" min="0" value={f.calories} onChange={(e) => set("calories", e.target.value)} className={inputClass} />
          </Field>
        </div>
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
        <Field label="Notes (optional)">
          <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="3 tortillas, calculated from saved portion." />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add to diary"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function optStr(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = parseFloat(value);
  return Number.isNaN(n) ? "" : String(n);
}
