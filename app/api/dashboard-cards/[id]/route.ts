import { NextResponse } from "next/server";
import { updateCard, deleteCard, type VizType } from "@/lib/dashboard-store";

const VIZ_TYPES: VizType[] = ["table", "line", "bar", "stat"];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const fields: { title?: string; prompt?: string; vizType?: VizType } = {};
  if (typeof body?.title === "string" && body.title.trim()) fields.title = body.title.trim();
  if (typeof body?.prompt === "string" && body.prompt.trim()) fields.prompt = body.prompt.trim();
  if (VIZ_TYPES.includes(body?.vizType)) fields.vizType = body.vizType;

  const card = await updateCard(id, fields);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteCard(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
