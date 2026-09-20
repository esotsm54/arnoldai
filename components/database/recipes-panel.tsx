"use client";

import { useEffect, useRef, useState } from "react";
import {
  Modal,
  DetailRow,
  Field,
  inputClass,
  primaryButtonClass,
  ghostButtonClass,
  num,
  SearchBar,
  matches,
} from "@/components/ui";
import { FoodFormModal, type Food } from "./foods-panel";
import type { Recipe, RecipeIngredient } from "@/lib/recipe-store";

type View =
  | { mode: "detail"; recipe: Recipe }
  | { mode: "edit"; recipe: Recipe }
  | { mode: "create" }
  | null;

function toNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

export function RecipesPanel() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(null);
  const [query, setQuery] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Could not load recipes");
      const data: Recipe[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recipes");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = (recipes ?? []).filter((r) => matches(r.name, query));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search recipes" />
        <button onClick={() => setView({ mode: "create" })} className={`${primaryButtonClass} shrink-0`}>
          + Add recipe
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!recipes && !error && <p className="text-sm text-slate-400">Loading recipes…</p>}
      {recipes && recipes.length === 0 && (
        <p className="text-sm text-slate-400">No recipes yet. Add the first one.</p>
      )}
      {recipes && recipes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate-400">No recipes match “{query}”.</p>
      )}

      {filtered.length > 0 && (
        <ul className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm divide-y divide-black/5 overflow-hidden">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setView({ mode: "detail", recipe: r })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {r.ingredients.length} ingredient{r.ingredients.length === 1 ? "" : "s"} · {num(r.totalCalories)} kcal / {num(r.totalAmount)} {r.totalUnit}
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
        <Modal title={view.recipe.name} onClose={() => setView(null)}>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Ingredients</p>
            <ul className="divide-y divide-black/5">
              {view.recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-800 truncate">{ing.foodName}</span>
                  <span className="text-slate-500 shrink-0">
                    {num(ing.amount)} {ing.unit} · {num(ing.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 border-t border-black/5 pt-3">
            <DetailRow label="Total weight" value={`${num(view.recipe.totalAmount)} ${view.recipe.totalUnit}`} />
            <DetailRow label="Total calories" value={`${num(view.recipe.totalCalories)} kcal`} />
            <DetailRow label="Protein" value={`${num(view.recipe.totalProtein)} g`} />
            <DetailRow label="Fat" value={`${num(view.recipe.totalFat)} g`} />
            <DetailRow label="Carbohydrates" value={`${num(view.recipe.totalCarbohydrates)} g`} />
            <DetailRow label="Sodium" value={`${num(view.recipe.totalSodium)} mg`} />
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ mode: "edit", recipe: view.recipe })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {(view?.mode === "edit" || view?.mode === "create") && (
        <RecipeFormModal
          initial={view.mode === "edit" ? view.recipe : undefined}
          onClose={() => setView(null)}
          onSaved={async () => {
            setView(null);
            await load();
          }}
          onDelete={
            view.mode === "edit"
              ? async () => {
                  const res = await fetch(`/api/recipes/${view.recipe.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Could not delete recipe");
                  setView(null);
                  await load();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// A draft ingredient keeps a reference point (refAmount/refCalories/...) to
// scale from as the amount changes — for a freshly picked food that's its
// base-amount values; for an ingredient loaded from an existing recipe it's
// simply that ingredient's own stored (amount, calories) pair, since that's
// already a valid point on the same linear scale. Either way, rescaling never
// needs to look the underlying food back up (which may since have changed or
// been deleted). `amountStr` is kept as free text so clearing the field to
// type a new number never gets clobbered by a recompute (see food-log-form).
type DraftIngredient = {
  foodId: string;
  foodName: string;
  unit: string;
  amountStr: string;
  refAmount: number;
  refCalories: number;
  refProtein: number | null;
  refFat: number | null;
  refCarbohydrates: number | null;
  refSodium: number | null;
};

function scaleIngredient(ing: DraftIngredient): RecipeIngredient {
  const amount = toNum(ing.amountStr);
  const factor = ing.refAmount > 0 ? amount / ing.refAmount : 0;
  return {
    foodId: ing.foodId,
    foodName: ing.foodName,
    amount,
    unit: ing.unit,
    calories: round1(ing.refCalories * factor),
    protein: ing.refProtein === null ? null : round1(ing.refProtein * factor),
    fat: ing.refFat === null ? null : round1(ing.refFat * factor),
    carbohydrates: ing.refCarbohydrates === null ? null : round1(ing.refCarbohydrates * factor),
    sodium: ing.refSodium === null ? null : round1(ing.refSodium * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function draftFromIngredient(ing: RecipeIngredient): DraftIngredient {
  return {
    foodId: ing.foodId,
    foodName: ing.foodName,
    unit: ing.unit,
    amountStr: String(ing.amount),
    refAmount: ing.amount,
    refCalories: ing.calories,
    refProtein: ing.protein,
    refFat: ing.fat,
    refCarbohydrates: ing.carbohydrates,
    refSodium: ing.sodium,
  };
}

function draftFromFood(food: Food): DraftIngredient {
  const refAmount = toNum(food.baseAmount);
  return {
    foodId: food.id,
    foodName: food.name,
    unit: food.baseUnit,
    amountStr: String(refAmount),
    refAmount,
    refCalories: toNum(food.calories),
    refProtein: food.protein === null ? null : toNum(food.protein),
    refFat: food.fat === null ? null : toNum(food.fat),
    refCarbohydrates: food.carbohydrates === null ? null : toNum(food.carbohydrates),
    refSodium: food.sodium === null ? null : toNum(food.sodium),
  };
}

function RecipeFormModal({
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  initial?: Recipe;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    (initial?.ingredients ?? []).map(draftFromIngredient)
  );
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodQuery, setFoodQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [addingFood, setAddingFood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadFoods() {
    const res = await fetch("/api/arnold/foods");
    if (res.ok) {
      const data: Food[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(data);
    }
  }

  useEffect(() => {
    loadFoods();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const foodMatches = foodQuery.trim() ? foods.filter((f) => matches(f.name, foodQuery)) : foods;

  function addIngredient(food: Food) {
    setIngredients((prev) => [...prev, draftFromFood(food)]);
    setFoodQuery("");
    setPickerOpen(false);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function setAmount(index: number, amountStr: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, amountStr } : ing)));
  }

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

  const scaled = ingredients.map(scaleIngredient);
  const totals = {
    amount: round1(scaled.reduce((s, i) => s + i.amount, 0)),
    calories: round1(scaled.reduce((s, i) => s + i.calories, 0)),
    protein: sumOptional(scaled, "protein"),
    fat: sumOptional(scaled, "fat"),
    carbohydrates: sumOptional(scaled, "carbohydrates"),
    sodium: sumOptional(scaled, "sodium"),
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || ingredients.length === 0) {
      setError("Give the recipe a name and at least one ingredient.");
      return;
    }
    if (scaled.some((i) => i.amount <= 0)) {
      setError("Every ingredient needs an amount greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/recipes/${initial.id}` : "/api/recipes", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), ingredients: scaled }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Edit recipe" : "New recipe"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Chicken and rice bowl" />
        </Field>

        <div>
          <p className="mb-1.5 text-sm text-slate-700">Ingredients</p>
          {ingredients.length > 0 && (
            <ul className="mb-2 flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-white/80 ring-1 ring-black/5 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{ing.foodName}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={ing.amountStr}
                    onChange={(e) => setAmount(i, e.target.value)}
                    className="w-20 shrink-0 rounded-lg bg-white ring-1 ring-black/10 px-2 py-1 text-sm text-right outline-none focus:ring-slate-400"
                  />
                  <span className="w-6 shrink-0 text-xs text-slate-400">{ing.unit}</span>
                  <span className="w-16 shrink-0 text-right text-xs text-slate-500">{num(scaled[i].calories)} kcal</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    aria-label="Remove ingredient"
                    className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="relative" ref={pickerRef}>
            <input
              value={foodQuery}
              onChange={(e) => {
                setFoodQuery(e.target.value);
                setPickerOpen(true);
              }}
              onFocus={() => setPickerOpen(true)}
              placeholder="Search foods to add…"
              className={inputClass}
            />
            {pickerOpen && (
              <ul className="thin-scroll absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-black/10">
                {foodMatches.length === 0 && (
                  <li className="px-4 py-2.5 text-sm text-slate-400">No matches.</li>
                )}
                {foodMatches.map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => addIngredient(food)}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                    >
                      {food.name}
                    </button>
                  </li>
                ))}
                <li className="border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      setAddingFood(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-900 hover:bg-slate-100"
                  >
                    + New food…
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 ring-1 ring-black/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Totals</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.amount)} g</p>
              <p className="text-xs text-slate-500">Weight</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.calories)}</p>
              <p className="text-xs text-slate-500">kcal</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.protein)} g</p>
              <p className="text-xs text-slate-500">Protein</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.fat)} g</p>
              <p className="text-xs text-slate-500">Fat</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.carbohydrates)} g</p>
              <p className="text-xs text-slate-500">Carbs</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{num(totals.sodium)} mg</p>
              <p className="text-xs text-slate-500">Sodium</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create recipe"}
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
              Delete recipe
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-700">Delete this recipe? This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-full bg-red-500 text-white px-6 py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className={ghostButtonClass}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {addingFood && (
        <FoodFormModal
          onClose={() => setAddingFood(false)}
          onSaved={async () => {
            setAddingFood(false);
            await loadFoods();
          }}
        />
      )}
    </Modal>
  );
}

function sumOptional(
  items: RecipeIngredient[],
  key: "protein" | "fat" | "carbohydrates" | "sodium"
): number | null {
  const values = items.map((i) => i[key]).filter((v): v is number => v !== null);
  return values.length > 0 ? round1(values.reduce((s, v) => s + v, 0)) : null;
}
