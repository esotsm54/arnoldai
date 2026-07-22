import { NextResponse } from "next/server";
import { getCard, setCardResult } from "@/lib/dashboard-store";
import { runCardQuery } from "@/lib/ai-dashboard";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await runCardQuery(card.prompt, card.vizType);
    const updated = await setCardResult(id, { data });
    return NextResponse.json(updated);
  } catch (err) {
    const updated = await setCardResult(id, {
      error: err instanceof Error ? err.message : "Query failed",
    });
    return NextResponse.json(updated, { status: 502 });
  }
}
