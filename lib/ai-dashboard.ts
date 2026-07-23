import OpenAI from "openai";
import type { ResponseFunctionToolCall, ResponseInputItem } from "openai/resources/responses/responses";
import { READ_ONLY_TOOLS } from "@/lib/ai-tools";
import { todayISO } from "@/lib/today";
import type { VizType } from "@/lib/dashboard-store";

// Small, cheap reasoning model — same one used for chat.
const MODEL = "gpt-5-mini";
const MAX_TOOL_ITERATIONS = 6;

const INSTRUCTIONS = `You answer data queries about the user's nutrition/fitness data using the available read-only tools. Gather whatever data is needed, then respond with ONLY the structured data requested — no prose, no explanations, no extra commentary.\n\nFor table cells (which have no separate unit field), format numbers as display strings with thousand separators and units inline where helpful (e.g. "1,489 kcal"). For a "stat" card, and for each entry of a "stats" card (several numbers in one card, e.g. eaten/burned/deficit side by side), the "value" field and the "unit" field are shown side by side by the UI — put ONLY the formatted number (with thousand separators, no unit word) in "value" (e.g. "1,489"), and put the unit word ONLY in "unit" (e.g. "kcal"). Never repeat the unit in both fields — that renders as "1,489 kcal kcal" on screen. Also never write raw tool/field names (e.g. "cumulativeDeficit", "eaten", "burned") into any visible title, value, or caption — translate them into plain language instead.\n\nFor anything involving calorie deficit/surplus, daily totals, or a running/cumulative total across days, ALWAYS call get_daily_summary and use its eaten/burned/deficit/cumulativeDeficit fields as-is — never sum food_log/exercise entries, compute the deficit formula, or add up multiple days yourself. Any arithmetic you do by hand on this data is assumed wrong; only the tool's numbers are trustworthy.\n\nFor a "combo" card (bar + line series over the same x-axis, all sharing one y-axis in kcal — so only combine series that are directly comparable in kcal): "categories" are the x-axis labels (e.g. dates), in chronological order. "bar" is at most one bar series as {label, values} with one number per category — set it to null if the user didn't ask for bars. "lines" is an array of one or more line series as {label, values}, each with exactly one number per category (e.g. a constant target repeated across every category for a "minimum to save" line, or a rolling/moving average computed from the same per-day numbers — a simple average like this is fine to compute yourself, it is not the deficit formula). Every values array must have the same length as "categories".\n\nToday's date is ${todayISO()} (YYYY-MM-DD).`;

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
    case "stats":
      return {
        name: "stats_data",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            stats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                  unit: { type: ["string", "null"] },
                },
                required: ["label", "value", "unit"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "stats"],
          additionalProperties: false,
        },
      };
    case "combo": {
      const series = {
        type: "object",
        properties: {
          label: { type: "string" },
          values: { type: "array", items: { type: "number" } },
        },
        required: ["label", "values"],
        additionalProperties: false,
      };
      return {
        name: "combo_data",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            categories: { type: "array", items: { type: "string" } },
            bar: { ...series, type: ["object", "null"] },
            lines: { type: "array", items: series },
          },
          required: ["title", "categories", "bar", "lines"],
          additionalProperties: false,
        },
      };
    }
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
