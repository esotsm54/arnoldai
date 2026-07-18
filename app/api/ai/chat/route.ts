import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set. Add it to .env.local." },
      { status: 500 }
    );
  }

  const { messages } = await request.json().catch(() => ({ messages: null }));
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Body must be { messages: [{ role, content }, ...] }" },
      { status: 400 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    return NextResponse.json({
      reply: completion.choices[0]?.message?.content ?? "",
    });
  } catch (err) {
    console.error("OpenAI request failed:", err);
    return NextResponse.json(
      { error: "OpenAI request failed" },
      { status: 502 }
    );
  }
}
