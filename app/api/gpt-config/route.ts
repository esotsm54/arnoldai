import { NextResponse } from "next/server";
import { getGptConfig, saveGptConfig } from "@/lib/gpt-config-store";

export async function GET() {
  return NextResponse.json(await getGptConfig());
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.instructions !== "string") {
    return NextResponse.json({ error: "instructions must be a string" }, { status: 400 });
  }
  await saveGptConfig({ instructions: body.instructions });
  return NextResponse.json({ ok: true });
}
