import OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses";
import { getGptConfig } from "@/lib/gpt-config-store";
import { ALL_TOOLS } from "@/lib/ai-tools";
import { todayISO } from "@/lib/today";

// Small, cheap reasoning model — swap for "gpt-5" or "gpt-5.1" for more
// capability at higher cost/latency.
const MODEL = "gpt-5-mini";
const MAX_TOOL_ITERATIONS = 6;

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
  }\n\nToday's date is ${todayISO()} (YYYY-MM-DD). You can read and write the user's data (diary, exercise, food library, body measurements, profile) through your tools. Only call a create/update/delete tool when the user's request clearly asks for that change — look up ids with the matching read tool first, and never guess an id. Confirm what you did afterward in plain language. For anything involving calorie deficit/surplus, daily totals, or a running/cumulative total across days, ALWAYS call get_daily_summary and use its eaten/burned/deficit/cumulativeDeficit fields as-is — never sum entries or add up multiple days yourself.`;

  const openai = new OpenAI({ apiKey });
  const tools = ALL_TOOLS.map(({ name, description, parameters }) => ({
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
          (m: { role: string; content: unknown }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })
        ) as ResponseInputItem[];

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const responseStream = openai.responses.stream({
            model: MODEL,
            instructions,
            input,
            reasoning: { effort: "low", summary: "auto" },
            tools,
            // We replay the whole transcript ourselves each turn (see `input`
            // above), so nothing depends on OpenAI retaining this response —
            // opt out of their storage/retrieval feature entirely.
            store: false,
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
            const tool = ALL_TOOLS.find((t) => t.name === call.name);
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.arguments || "{}");
            } catch {
              // malformed arguments from the model — proceed with empty args
            }
            send({ type: "action", label: tool ? tool.label(args) : `Running ${call.name}` });
            let output: string;
            try {
              const result = tool ? await tool.execute(args) : { error: "Unknown tool" };
              // Some calls (e.g. a successful DELETE) return no body; JSON.stringify(undefined)
              // yields the JS value undefined, which would silently drop the "output" field.
              output = JSON.stringify(result === undefined ? { success: true } : result);
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
