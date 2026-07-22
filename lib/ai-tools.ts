import { apiFetch } from "@/lib/api-client";
import { computeDailySummaries } from "@/lib/deficit";

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

// Strict mode requires every property to be present, so optional fields are
// modeled as nullable and the model sends null to mean "omit this". Drop
// those before building the request body sent to the Arnold API.
function pruneNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

const nullableString = { type: ["string", "null"] as const };
const nullableNumber = { type: ["number", "null"] as const };

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
          ...nullableString,
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
      "Get the user's food diary entries (id, what they ate, when, and macros). Provide a date (YYYY-MM-DD) to get only that day; pass null to get every logged day. You need the entry's id to edit or delete it.",
    parameters: {
      type: "object",
      properties: {
        date: { ...nullableString, description: "YYYY-MM-DD. Pass null for all days." },
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
      "Get the user's logged exercise/workouts (id, name, duration, calories burned). Provide a date (YYYY-MM-DD) to get only that day; pass null to get every logged day. You need the entry's id to edit or delete it.",
    parameters: {
      type: "object",
      properties: {
        date: { ...nullableString, description: "YYYY-MM-DD. Pass null for all days." },
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
      "Get the user's body measurement history over time: id, day, weight (kg), body fat %, and circumference measurements. You need the entry's id to edit or delete it.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: () => apiFetch("/body"),
    label: () => "Reading weight & body measurements",
  },
  {
    name: "get_daily_summary",
    description:
      "Get precomputed daily totals for each day that has any food or exercise logged: eaten, burned, deficit (TDEE 2730 + burned − eaten), AND cumulativeDeficit — the running total of deficit from the earliest logged day through that day (i.e. total calories banked to date). ALWAYS use these numbers as-is instead of summing food_log/exercise entries, computing the deficit formula, or adding up multiple days' deficits yourself — every value here, including the running total, is computed in code, not by you, so it cannot contain an arithmetic mistake. Provide a date (YYYY-MM-DD) for one day; pass null for every day.",
    parameters: {
      type: "object",
      properties: {
        date: { ...nullableString, description: "YYYY-MM-DD. Pass null for every day." },
      },
      required: ["date"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const [logs, exercises] = await Promise.all([
        apiFetch<Array<{ date: string; calories: string }>>("/log"),
        apiFetch<Array<{ date: string; caloriesBurned: string }>>("/exercise"),
      ]);
      const summaries = computeDailySummaries(logs, exercises);
      const date = str(args, "date");
      return date ? summaries.filter((s) => s.date === date) : summaries;
    },
    label: (args) => {
      const date = str(args, "date");
      return date ? `Computing daily summary for ${date}` : "Computing daily summaries";
    },
  },
];

export const WRITE_TOOLS: ToolDef[] = [
  {
    name: "add_food_log_entry",
    description:
      "Add a food diary entry for a specific day and meal. If the food is in the saved library, use find_foods first and scale its per-base-amount values to the eaten amount.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        foodName: { type: "string" },
        weightAmount: { type: "number", description: "Amount eaten" },
        weightUnit: { type: "string", description: "Usually g" },
        calories: { type: "number", description: "Calories for the amount eaten" },
        protein: { ...nullableNumber, description: "Grams. Null if unknown." },
        fat: { ...nullableNumber, description: "Grams. Null if unknown." },
        carbohydrates: { ...nullableNumber, description: "Grams. Null if unknown." },
        sodium: { ...nullableNumber, description: "Milligrams. Null if unknown." },
        notes: { ...nullableString, description: "Optional explanation. Null if none." },
      },
      required: [
        "date",
        "mealType",
        "foodName",
        "weightAmount",
        "weightUnit",
        "calories",
        "protein",
        "fat",
        "carbohydrates",
        "sodium",
        "notes",
      ],
      additionalProperties: false,
    },
    execute: (args) => apiFetch("/log", { method: "POST", body: JSON.stringify(pruneNulls(args)) }),
    label: (args) => `Adding ${str(args, "foodName") ?? "food"} to ${str(args, "mealType") ?? "diary"}`,
  },
  {
    name: "update_food_log_entry",
    description:
      "Edit an existing food diary entry. Only send the fields that should change — the rest are left as-is. Look up the id with get_food_log first.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        date: { ...nullableString },
        mealType: {
          type: ["string", "null"],
          enum: ["breakfast", "lunch", "dinner", "snack", null],
        },
        foodName: { ...nullableString },
        weightAmount: { ...nullableNumber },
        weightUnit: { ...nullableString },
        calories: { ...nullableNumber },
        protein: { ...nullableNumber },
        fat: { ...nullableNumber },
        carbohydrates: { ...nullableNumber },
        sodium: { ...nullableNumber },
        notes: { ...nullableString },
      },
      required: [
        "id",
        "date",
        "mealType",
        "foodName",
        "weightAmount",
        "weightUnit",
        "calories",
        "protein",
        "fat",
        "carbohydrates",
        "sodium",
        "notes",
      ],
      additionalProperties: false,
    },
    execute: (args) => {
      const { id, ...rest } = pruneNulls(args);
      return apiFetch(`/log/${id}`, { method: "PATCH", body: JSON.stringify(rest) });
    },
    label: () => "Updating food diary entry",
  },
  {
    name: "delete_food_log_entry",
    description:
      "Permanently delete a food diary entry. Only call this when the user clearly identified which entry to remove. Look up the id with get_food_log first.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch(`/log/${str(args, "id")}`, { method: "DELETE" }),
    label: () => "Deleting food diary entry",
  },

  {
    name: "add_exercise_entry",
    description: "Log a workout/exercise session for a specific day.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        name: { type: "string" },
        durationMinutes: { type: "number" },
        caloriesBurned: {
          type: "number",
          description: "Prefer net/active calories, not gross watch calories.",
        },
        notes: { ...nullableString },
      },
      required: ["date", "name", "durationMinutes", "caloriesBurned", "notes"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch("/exercise", { method: "POST", body: JSON.stringify(pruneNulls(args)) }),
    label: (args) => `Logging exercise: ${str(args, "name") ?? "workout"}`,
  },
  {
    name: "update_exercise_entry",
    description:
      "Edit an existing exercise entry. Only send the fields that should change. Look up the id with get_exercise_log first.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        date: { ...nullableString },
        name: { ...nullableString },
        durationMinutes: { ...nullableNumber },
        caloriesBurned: { ...nullableNumber },
        notes: { ...nullableString },
      },
      required: ["id", "date", "name", "durationMinutes", "caloriesBurned", "notes"],
      additionalProperties: false,
    },
    execute: (args) => {
      const { id, ...rest } = pruneNulls(args);
      return apiFetch(`/exercise/${id}`, { method: "PATCH", body: JSON.stringify(rest) });
    },
    label: () => "Updating exercise entry",
  },
  {
    name: "delete_exercise_entry",
    description:
      "Permanently delete an exercise entry. Only call this when the user clearly identified which entry to remove. Look up the id with get_exercise_log first.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch(`/exercise/${str(args, "id")}`, { method: "DELETE" }),
    label: () => "Deleting exercise entry",
  },

  {
    name: "add_food",
    description:
      "Save a new reusable food to the library, with calories/macros per a base amount (usually 100 g) and a usual portion.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        calories: { type: "number" },
        baseAmount: { type: "number", description: "Usually 100" },
        baseUnit: { type: "string", description: "Usually g" },
        portionAmount: { type: "number" },
        portionUnit: { type: "string" },
        portionDescription: { type: "string", description: 'e.g. "1 slice", "1 can"' },
        protein: { ...nullableNumber },
        fat: { ...nullableNumber },
        carbohydrates: { ...nullableNumber },
        sodium: { ...nullableNumber },
      },
      required: [
        "name",
        "calories",
        "baseAmount",
        "baseUnit",
        "portionAmount",
        "portionUnit",
        "portionDescription",
        "protein",
        "fat",
        "carbohydrates",
        "sodium",
      ],
      additionalProperties: false,
    },
    execute: (args) => apiFetch("/foods", { method: "POST", body: JSON.stringify(pruneNulls(args)) }),
    label: (args) => `Saving food: ${str(args, "name") ?? ""}`,
  },
  {
    name: "update_food",
    description:
      "Edit an existing saved food. Only send the fields that should change. Look up the id with find_foods first.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { ...nullableString },
        calories: { ...nullableNumber },
        baseAmount: { ...nullableNumber },
        baseUnit: { ...nullableString },
        portionAmount: { ...nullableNumber },
        portionUnit: { ...nullableString },
        portionDescription: { ...nullableString },
        protein: { ...nullableNumber },
        fat: { ...nullableNumber },
        carbohydrates: { ...nullableNumber },
        sodium: { ...nullableNumber },
      },
      required: [
        "id",
        "name",
        "calories",
        "baseAmount",
        "baseUnit",
        "portionAmount",
        "portionUnit",
        "portionDescription",
        "protein",
        "fat",
        "carbohydrates",
        "sodium",
      ],
      additionalProperties: false,
    },
    execute: (args) => {
      const { id, ...rest } = pruneNulls(args);
      return apiFetch(`/foods/${id}`, { method: "PATCH", body: JSON.stringify(rest) });
    },
    label: () => "Updating saved food",
  },
  {
    name: "delete_food",
    description:
      "Permanently delete a saved food from the library. Only call this when the user clearly identified which food to remove. Look up the id with find_foods first.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch(`/foods/${str(args, "id")}`, { method: "DELETE" }),
    label: () => "Deleting saved food",
  },

  {
    name: "add_body_entry",
    description:
      "Add a body measurement entry for a day: weight, body fat %, and/or circumference measurements. Only the day is mandatory — send null for anything not measured.",
    parameters: {
      type: "object",
      properties: {
        day: { type: "string", description: "YYYY-MM-DD" },
        weightKg: { ...nullableNumber },
        fatPercentage: { ...nullableNumber },
        waistCm: { ...nullableNumber },
        hipsCm: { ...nullableNumber },
        chestCm: { ...nullableNumber },
        leftArmCm: { ...nullableNumber },
        rightArmCm: { ...nullableNumber },
        leftThighCm: { ...nullableNumber },
        rightThighCm: { ...nullableNumber },
      },
      required: [
        "day",
        "weightKg",
        "fatPercentage",
        "waistCm",
        "hipsCm",
        "chestCm",
        "leftArmCm",
        "rightArmCm",
        "leftThighCm",
        "rightThighCm",
      ],
      additionalProperties: false,
    },
    execute: (args) => apiFetch("/body", { method: "POST", body: JSON.stringify(pruneNulls(args)) }),
    label: (args) => `Logging body measurements for ${str(args, "day") ?? "today"}`,
  },
  {
    name: "update_body_entry",
    description:
      "Edit an existing body measurement entry. Only send the fields that should change. Look up the id with get_body_entries first.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        day: { ...nullableString },
        weightKg: { ...nullableNumber },
        fatPercentage: { ...nullableNumber },
        waistCm: { ...nullableNumber },
        hipsCm: { ...nullableNumber },
        chestCm: { ...nullableNumber },
        leftArmCm: { ...nullableNumber },
        rightArmCm: { ...nullableNumber },
        leftThighCm: { ...nullableNumber },
        rightThighCm: { ...nullableNumber },
      },
      required: [
        "id",
        "day",
        "weightKg",
        "fatPercentage",
        "waistCm",
        "hipsCm",
        "chestCm",
        "leftArmCm",
        "rightArmCm",
        "leftThighCm",
        "rightThighCm",
      ],
      additionalProperties: false,
    },
    execute: (args) => {
      const { id, ...rest } = pruneNulls(args);
      return apiFetch(`/body/${id}`, { method: "PATCH", body: JSON.stringify(rest) });
    },
    label: () => "Updating body measurements",
  },
  {
    name: "delete_body_entry",
    description:
      "Permanently delete a body measurement entry. Only call this when the user clearly identified which entry to remove. Look up the id with get_body_entries first.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch(`/body/${str(args, "id")}`, { method: "DELETE" }),
    label: () => "Deleting body measurement entry",
  },

  {
    name: "update_profile",
    description:
      "Update the user's profile. Only send the fields that should change; send null for the rest.",
    parameters: {
      type: "object",
      properties: {
        dateOfBirth: { ...nullableString, description: "YYYY-MM-DD" },
        sex: { type: ["string", "null"], enum: ["male", "female", null] },
        heightMeters: { ...nullableNumber },
        activityLevel: {
          type: ["string", "null"],
          enum: [
            "sedentary",
            "lightly_active",
            "moderately_active",
            "very_active",
            "extra_active",
            null,
          ],
        },
      },
      required: ["dateOfBirth", "sex", "heightMeters", "activityLevel"],
      additionalProperties: false,
    },
    execute: (args) => apiFetch("/user-info", { method: "PATCH", body: JSON.stringify(pruneNulls(args)) }),
    label: () => "Updating profile",
  },
];

export const ALL_TOOLS: ToolDef[] = [...READ_ONLY_TOOLS, ...WRITE_TOOLS];
