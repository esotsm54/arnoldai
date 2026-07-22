import { NextResponse } from "next/server";
import { listCards, createCard, setCardResult, type VizType } from "@/lib/dashboard-store";
import { runCardQuery } from "@/lib/ai-dashboard";

const VIZ_TYPES: VizType[] = ["table", "line", "bar", "stat"];

export async function GET() {
  return NextResponse.json(await listCards());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const vizType = body?.vizType as VizType;
  if (!title || !prompt || !VIZ_TYPES.includes(vizType)) {
    return NextResponse.json(
      { error: "title, prompt, and a valid vizType are required" },
      { status: 400 }
    );
  }

  const card = await createCard(title, prompt, vizType);

  // Populate it immediately so the card isn't blank on creation.
  try {
    const data = await runCardQuery(card.prompt, card.vizType);
    const updated = await setCardResult(card.id, { data });
    return NextResponse.json(updated ?? card);
  } catch (err) {
    const updated = await setCardResult(card.id, {
      error: err instanceof Error ? err.message : "Query failed",
    });
    return NextResponse.json(updated ?? card);
  }
}
