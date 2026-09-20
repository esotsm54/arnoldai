"use client";

import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Field,
  inputClass,
  primaryButtonClass,
  ghostButtonClass,
  matches,
} from "@/components/ui";
import type { Food, LogEntry } from "./types";
import { toNum } from "./types";
import type { Recipe } from "@/lib/recipe-store";

const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Foods and recipes are prefill-able the same way — a recipe just uses its
// batch totals as the "base amount" (default portion = the whole recipe).
type LibItem = {
  id: string;
  name: string;
  kind: "food" | "recipe";
  baseAmount: number;
  baseUnit: string;
  portionAmount: number;
  calories: number;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  sodium: number | null;
};

function libItemFromFood(food: Food): LibItem {
  return {
    id: food.id,
    name: food.name,
    kind: "food",
    baseAmount: toNum(food.baseAmount),
    baseUnit: food.baseUnit,
    portionAmount: toNum(food.portionAmount),
    calories: toNum(food.calories),
    protein: food.protein === null ? null : toNum(food.protein),
    fat: food.fat === null ? null : toNum(food.fat),
    carbohydrates: food.carbohydrates === null ? null : toNum(food.carbohydrates),
    sodium: food.sodium === null ? null : toNum(food.sodium),
  };
}

function libItemFromRecipe(recipe: Recipe): LibItem {
  return {
    id: recipe.id,
    name: recipe.name,
    kind: "recipe",
    baseAmount: recipe.totalAmount,
    baseUnit: recipe.totalUnit,
    portionAmount: recipe.totalAmount,
    calories: recipe.totalCalories,
    protein: recipe.totalProtein,
    fat: recipe.totalFat,
    carbohydrates: recipe.totalCarbohydrates,
    sodium: recipe.totalSodium,
  };
}

export function FoodLogFormModal({
  initial,
  defaultDate,
  onClose,
  onSaved,
  onDelete,
}: {
  initial?: LogEntry;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => Promise<void>;
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
  const [libItems, setLibItems] = useState<LibItem[]>([]);
  const [libId, setLibId] = useState("");
  const [libQuery, setLibQuery] = useState("");
  const [libOpen, setLibOpen] = useState(false);
  const libBoxRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (libBoxRef.current && !libBoxRef.current.contains(e.target as Node)) {
        setLibOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const libMatches = libQuery.trim() ? libItems.filter((item) => matches(item.name, libQuery)) : libItems;

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/arnold/foods").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/recipes").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([foodsData, recipesData]: [Food[], Recipe[]]) => {
        const merged = [
          ...foodsData.map(libItemFromFood),
          ...recipesData.map(libItemFromRecipe),
        ].sort((a, b) => a.name.localeCompare(b.name));
        setLibItems(merged);
      })
      .catch(() => {});
  }, []);

  function set(key: keyof typeof f, value: string) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  // Scales the library item's (food's or recipe's) per-base values to the
  // eaten amount (docs §6). `amountStr` is only omitted on the initial pick
  // from the dropdown — once the user is editing the amount by hand, an
  // empty/zero value means they're mid-edit (e.g. clearing the field to type
  // a new number), not "use the default portion", so it must not be treated
  // as a fallback trigger.
  function applyLibrary(id: string, amountStr?: string) {
    const item = libItems.find((x) => x.id === id);
    if (!item) return;
    const isDefault = amountStr === undefined;
    const amount = isDefault ? item.portionAmount : toNum(amountStr);
    const factor = item.baseAmount > 0 ? amount / item.baseAmount : 0;
    setF((prev) => ({
      ...prev,
      foodName: item.name,
      // Only stamp a default amount on the initial pick — when called while
      // the user is typing, the input's own onChange already set the exact
      // text they typed (including a transient empty string), so leave it.
      weightAmount: isDefault ? String(amount) : prev.weightAmount,
      weightUnit: item.baseUnit,
      calories: String(round1(item.calories * factor)),
      protein: item.protein === null ? "" : String(round1(item.protein * factor)),
      fat: item.fat === null ? "" : String(round1(item.fat * factor)),
      carbohydrates: item.carbohydrates === null ? "" : String(round1(item.carbohydrates * factor)),
      sodium: item.sodium === null ? "" : String(round1(item.sodium * factor)),
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
        {libItems.length > 0 && (
          <Field label="Prefill from food library or a recipe (optional)">
            <div className="relative" ref={libBoxRef}>
              <input
                value={libQuery}
                onChange={(e) => {
                  setLibQuery(e.target.value);
                  setLibOpen(true);
                  if (libId) setLibId("");
                }}
                onFocus={() => setLibOpen(true)}
                placeholder="Search saved foods or recipes…"
                className={inputClass}
              />
              {libOpen && (
                <ul className="thin-scroll absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-black/10">
                  {libMatches.length === 0 && (
                    <li className="px-4 py-2.5 text-sm text-slate-400">No matches.</li>
                  )}
                  {libMatches.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setLibId(item.id);
                          setLibQuery(item.name);
                          setLibOpen(false);
                          applyLibrary(item.id);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                      >
                        <span className="truncate">{item.name}</span>
                        {item.kind === "recipe" && (
                          <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-200">
                            Recipe
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

      {onDelete && (
        <div className="mt-5 border-t border-black/5 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Delete entry
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-700">
                Delete this food entry? This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-full bg-red-500 text-white px-6 py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className={ghostButtonClass}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function optStr(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = parseFloat(value);
  return Number.isNaN(n) ? "" : String(n);
}
