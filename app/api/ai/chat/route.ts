import OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses";
import { getGptConfig } from "@/lib/gpt-config-store";
import { READ_ONLY_TOOLS } from "@/lib/ai-tools";

// Small, cheap reasoning model — swap for "gpt-5" or "gpt-5.1" for more
// capability at higher cost/latency.
const MODEL = "gpt-5-mini";
const MAX_TOOL_ITERATIONS = 6;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set. Add it to .env.local." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages) {
    return Response.json(
      { error: "Body must be { messages: [{ role, content }, ...] }" },
      { status: 400 }
    );
  }

  const { instructions: savedInstructions } = await getGptConfig();
  const instructions = `${
    savedInstructions || "You are Arnold, a helpful nutrition and fitness assistant."
  }\n\nToday's date is ${todayISO()} (YYYY-MM-DD). You can only read the user's data — you have no tools to add, edit, or delete anything, so never claim to have changed something.`;

  const openai = new OpenAI({ apiKey });
  const tools = READ_ONLY_TOOLS.map(({ name, description, parameters }) => ({
    type: "function" as const,
    name,
    description,
    parameters,
    strict: true,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const input: ResponseInputItem[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })
        );

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const responseStream = openai.responses.stream({
            model: MODEL,
            instructions,
            input,
            reasoning: { effort: "low", summary: "auto" },
            tools,
          });

          for await (const event of responseStream) {
            if (event.type === "response.reasoning_summary_text.delta") {
              send({ type: "thinking_delta", text: event.delta });
            } else if (event.type === "response.output_text.delta") {
              send({ type: "text_delta", text: event.delta });
            }
          }

          const final = await responseStream.finalResponse();
          const functionCalls = final.output.filter(
            (item) => item.type === "function_call"
          ) as unknown as ResponseFunctionToolCall[];

          if (functionCalls.length === 0) {
            send({ type: "done" });
            return;
          }

          // Replay only clean function_call items — the SDK's parsed helper
          // adds a `parsed_arguments` field that the API rejects on replay.
          for (const call of functionCalls) {
            input.push({
              type: "function_call",
              call_id: call.call_id,
              name: call.name,
              arguments: call.arguments,
            });
          }
          for (const call of functionCalls) {
            const tool = READ_ONLY_TOOLS.find((t) => t.name === call.name);
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.arguments || "{}");
            } catch {
              // malformed arguments from the model — proceed with empty args
            }
            send({ type: "action", label: tool ? tool.label(args) : `Running ${call.name}` });
            let output: string;
            try {
              output = JSON.stringify(tool ? await tool.execute(args) : { error: "Unknown tool" });
            } catch (err) {
              output = JSON.stringify({
                error: err instanceof Error ? err.message : "Tool failed",
              });
            }
            input.push({ type: "function_call_output", call_id: call.call_id, output });
          }
        }

        send({ type: "error", message: "Stopped after too many tool calls." });
      } catch (err) {
        console.error("AI chat stream failed:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
