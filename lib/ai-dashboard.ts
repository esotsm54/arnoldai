import OpenAI from "openai";
import type { ResponseFunctionToolCall, ResponseInputItem } from "openai/resources/responses/responses";
import { READ_ONLY_TOOLS } from "@/lib/ai-tools";
import { todayISO } from "@/lib/today";
import type { VizType } from "@/lib/dashboard-store";

// Small, cheap reasoning model — same one used for chat.
const MODEL = "gpt-5-mini";
const MAX_TOOL_ITERATIONS = 6;

const INSTRUCTIONS = `You answer data queries about the user's nutrition/fitness data using the available read-only tools. Gather whatever data is needed, then respond with ONLY the structured data requested — no prose, no explanations, no extra commentary. Format numbers for display where the schema asks for a string (e.g. "1,489 kcal"), not raw numbers.\n\nFor anything involving calorie deficit/surplus, daily totals, or a running/cumulative total across days, ALWAYS call get_daily_summary and use its eaten/burned/deficit/cumulativeDeficit fields as-is — never sum food_log/exercise entries, compute the deficit formula, or add up multiple days yourself. Any arithmetic you do by hand on this data is assumed wrong; only the tool's numbers are trustworthy.\n\nToday's date is ${todayISO()} (YYYY-MM-DD).`;

function schemaFor(vizType: VizType): { name: string; schema: Record<string, unknown> } {
  switch (vizType) {
    case "table":
      return {
        name: "table_data",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            columns: { type: "array", items: { type: "string" } },
            rows: { type: "array", items: { type: "array", items: { type: "string" } } },
          },
          required: ["title", "columns", "rows"],
          additionalProperties: false,
        },
      };
    case "stat":
      return {
        name: "stat_data",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            value: { type: "string" },
            unit: { type: ["string", "null"] },
            caption: { type: ["string", "null"] },
          },
          required: ["title", "value", "unit", "caption"],
          additionalProperties: false,
        },
      };
    case "line":
    case "bar":
      return {
        name: "points_data",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            points: {
              type: "array",
              items: {
                type: "object",
                properties: { label: { type: "string" }, value: { type: "number" } },
                required: ["label", "value"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "points"],
          additionalProperties: false,
        },
      };
  }
}

// Runs a headless, read-only, tool-calling loop that ends in a structured
// JSON answer (no chat, no streaming) — used to populate a dashboard card.
export async function runCardQuery(prompt: string, vizType: VizType): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const openai = new OpenAI({ apiKey });
  const tools = READ_ONLY_TOOLS.map(({ name, description, parameters }) => ({
    type: "function" as const,
    name,
    description,
    parameters,
    strict: true,
  }));
  const { name, schema } = schemaFor(vizType);

  const input: ResponseInputItem[] = [{ role: "user", content: prompt }];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const res = await openai.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input,
      reasoning: { effort: "low" },
      tools,
      text: { format: { type: "json_schema", name, schema, strict: true } },
      store: false,
    });

    const calls = res.output.filter(
      (item) => item.type === "function_call"
    ) as unknown as ResponseFunctionToolCall[];

    if (calls.length === 0) {
      if (!res.output_text) throw new Error("Empty response from the model.");
      return JSON.parse(res.output_text);
    }

    for (const call of calls) {
      input.push({
        type: "function_call",
        call_id: call.call_id,
        name: call.name,
        arguments: call.arguments,
      });
    }
    for (const call of calls) {
      const tool = READ_ONLY_TOOLS.find((t) => t.name === call.name);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        // malformed arguments from the model — proceed with empty args
      }
      let output: string;
      try {
        const result = tool ? await tool.execute(args) : { error: "Unknown tool" };
        output = JSON.stringify(result === undefined ? { success: true } : result);
      } catch (err) {
        output = JSON.stringify({ error: err instanceof Error ? err.message : "Tool failed" });
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output });
    }
  }

  throw new Error("Stopped after too many tool calls.");
}
