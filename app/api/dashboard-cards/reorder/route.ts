import { NextResponse } from "next/server";
import { reorderCards } from "@/lib/dashboard-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
  }
  return NextResponse.json(await reorderCards(ids));
}
