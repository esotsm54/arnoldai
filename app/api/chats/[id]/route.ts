import { NextResponse } from "next/server";
import { getConversation, saveMessages, deleteConversation } from "@/lib/chat-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }
  const conv = await saveMessages(id, body.messages);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteConversation(id);
  if (!ok) return NextResponse.json({ error: "Cannot delete this conversation" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
