import { NextResponse } from "next/server";
import { getRecipe, updateRecipe, deleteRecipe, type RecipeIngredient } from "@/lib/recipe-store";

function isValidIngredients(value: unknown): value is RecipeIngredient[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (i) =>
        i &&
        typeof i.foodId === "string" &&
        typeof i.foodName === "string" &&
        typeof i.amount === "number" &&
        typeof i.unit === "string"
    )
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const fields: { name?: string; ingredients?: RecipeIngredient[] } = {};
  if (typeof body?.name === "string" && body.name.trim()) fields.name = body.name.trim();
  if (isValidIngredients(body?.ingredients)) fields.ingredients = body.ingredients;

  const recipe = await updateRecipe(id, fields);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteRecipe(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
