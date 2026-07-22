import { NextResponse } from "next/server";
import { listConversations, createConversation } from "@/lib/chat-store";

export async function GET() {
  return NextResponse.json(await listConversations());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const temporary = body?.temporary !== false;
  const title = typeof body?.title === "string" ? body.title : undefined;
  const conv = await createConversation(temporary, title);
  return NextResponse.json(conv);
}
