import { NextResponse } from "next/server";
import { listRecipes, createRecipe, type RecipeIngredient } from "@/lib/recipe-store";

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

export async function GET() {
  return NextResponse.json(await listRecipes());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || !isValidIngredients(body?.ingredients)) {
    return NextResponse.json(
      { error: "name and at least one ingredient are required" },
      { status: 400 }
    );
  }
  const recipe = await createRecipe(name, body.ingredients);
  return NextResponse.json(recipe, { status: 201 });
}
