import { apiFetch } from "@/lib/api-client";

// Read-only tools for the chat assistant. There is deliberately no
// create/update/delete tool here — the model can only look things up.
export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  label: (args: Record<string, unknown>) => string;
};

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const READ_ONLY_TOOLS: ToolDef[] = [
  {
    name: "get_profile",
    description:
      "Get the user's profile: date of birth, sex, height, and activity level. Used for TDEE/calorie calculations.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: () => apiFetch("/user-info"),
    label: () => "Reading profile",
  },
  {
    name: "find_foods",
    description:
      "Search the saved food library by name, or list all saved foods if no query is given. Each food has calories and macros per a base amount (usually 100 g) plus a usual portion.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: ["string", "null"],
          description: "Text to search for in food names. Pass null to list all foods.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    execute: (args) => {
      const query = str(args, "query");
      return query ? apiFetch(`/foods/search?q=${encodeURIComponent(query)}`) : apiFetch("/foods");
    },
    label: (args) => {
      const query = str(args, "query");
      return query ? `Searching foods: "${query}"` : "Listing saved foods";
    },
  },
  {
    name: "get_food_log",
    description:
      "Get the user's food diary entries (what they ate, when, and macros). Provide a date (YYYY-MM-DD) to get only that day; omit it to get every logged day.",
    parameters: {
      type: "object",
      properties: {
        date: { type: ["string", "null"], description: "YYYY-MM-DD. Pass null for all days." },
      },
      required: ["date"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const all = await apiFetch<Array<{ date: string }>>("/log");
      const date = str(args, "date");
      return date ? all.filter((l) => l.date === date) : all;
    },
    label: (args) => {
      const date = str(args, "date");
      return date ? `Reading diary for ${date}` : "Reading the full food diary";
    },
  },
  {
    name: "get_exercise_log",
    description:
      "Get the user's logged exercise/workouts (name, duration, calories burned). Provide a date (YYYY-MM-DD) to get only that day; omit it to get every logged day.",
    parameters: {
      type: "object",
      properties: {
        date: { type: ["string", "null"], description: "YYYY-MM-DD. Pass null for all days." },
      },
      required: ["date"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const all = await apiFetch<Array<{ date: string }>>("/exercise");
      const date = str(args, "date");
      return date ? all.filter((e) => e.date === date) : all;
    },
    label: (args) => {
      const date = str(args, "date");
      return date ? `Reading exercise for ${date}` : "Reading the full exercise log";
    },
  },
  {
    name: "get_body_entries",
    description:
      "Get the user's body measurement history over time: weight (kg), body fat %, and circumference measurements.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: () => apiFetch("/body"),
    label: () => "Reading weight & body measurements",
  },
];
