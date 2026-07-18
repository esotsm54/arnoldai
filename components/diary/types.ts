export type LogEntry = {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodName: string;
  weightAmount: string;
  weightUnit: string;
  calories: string;
  protein: string | null;
  fat: string | null;
  carbohydrates: string | null;
  sodium: string | null;
  notes: string | null;
};

export type ExerciseEntry = {
  id: string;
  date: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: string;
  notes: string | null;
};

export type Food = {
  id: string;
  name: string;
  calories: string;
  baseAmount: string;
  baseUnit: string;
  portionAmount: string;
  portionUnit: string;
  portionDescription: string;
  protein: string | null;
  fat: string | null;
  carbohydrates: string | null;
  sodium: string | null;
};

export function toNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}
