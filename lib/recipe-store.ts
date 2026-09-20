import crypto from "crypto";
import { readBlob, writeBlob } from "@/lib/kv";

const KEY = "arnold:recipes";

export type RecipeIngredient = {
  foodId: string;
  foodName: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  sodium: number | null;
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalAmount: number;
  totalUnit: string;
  totalCalories: number;
  totalProtein: number | null;
  totalFat: number | null;
  totalCarbohydrates: number | null;
  totalSodium: number | null;
  createdAt: string;
  updatedAt: string | null;
};

type Store = { recipes: Recipe[] };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sumOptional(
  ingredients: RecipeIngredient[],
  key: "protein" | "fat" | "carbohydrates" | "sodium"
): number | null {
  const values = ingredients.map((i) => i[key]).filter((v): v is number => v !== null);
  return values.length > 0 ? round1(values.reduce((s, v) => s + v, 0)) : null;
}

// Ingredient amounts are assumed to share one unit ("g" in practice, same as
// the rest of the app's food data) so they can be summed into one total.
function computeTotals(ingredients: RecipeIngredient[]) {
  return {
    totalAmount: round1(ingredients.reduce((s, i) => s + i.amount, 0)),
    totalCalories: round1(ingredients.reduce((s, i) => s + i.calories, 0)),
    totalProtein: sumOptional(ingredients, "protein"),
    totalFat: sumOptional(ingredients, "fat"),
    totalCarbohydrates: sumOptional(ingredients, "carbohydrates"),
    totalSodium: sumOptional(ingredients, "sodium"),
  };
}

async function readStore(): Promise<Store> {
  return readBlob<Store>(KEY, { recipes: [] });
}

async function writeStore(store: Store): Promise<void> {
  await writeBlob(KEY, store);
}

export async function listRecipes(): Promise<Recipe[]> {
  return (await readStore()).recipes;
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const store = await readStore();
  return store.recipes.find((r) => r.id === id) ?? null;
}

export async function createRecipe(
  name: string,
  ingredients: RecipeIngredient[]
): Promise<Recipe> {
  const store = await readStore();
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    name,
    ingredients,
    totalUnit: ingredients[0]?.unit ?? "g",
    ...computeTotals(ingredients),
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  store.recipes.push(recipe);
  await writeStore(store);
  return recipe;
}

export async function updateRecipe(
  id: string,
  fields: { name?: string; ingredients?: RecipeIngredient[] }
): Promise<Recipe | null> {
  const store = await readStore();
  const recipe = store.recipes.find((r) => r.id === id);
  if (!recipe) return null;
  if (fields.name !== undefined) recipe.name = fields.name;
  if (fields.ingredients !== undefined) {
    recipe.ingredients = fields.ingredients;
    recipe.totalUnit = fields.ingredients[0]?.unit ?? recipe.totalUnit;
    Object.assign(recipe, computeTotals(fields.ingredients));
  }
  recipe.updatedAt = new Date().toISOString();
  await writeStore(store);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.recipes.length;
  store.recipes = store.recipes.filter((r) => r.id !== id);
  if (store.recipes.length === before) return false;
  await writeStore(store);
  return true;
}
