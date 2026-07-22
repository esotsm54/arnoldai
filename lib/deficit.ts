// Single source of truth for the daily deficit formula, so the AI tools and
// any future UI agree with the Diary page's own calculation.
export const BASE_TDEE = 2730;

export type DailySummary = { date: string; eaten: number; burned: number; deficit: number };

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

export function computeDailySummaries(
  logs: Array<{ date: string; calories: string | number }>,
  exercises: Array<{ date: string; caloriesBurned: string | number }>
): DailySummary[] {
  const days = new Map<string, { eaten: number; burned: number }>();
  for (const l of logs) {
    const d = days.get(l.date) ?? { eaten: 0, burned: 0 };
    d.eaten += toNum(l.calories);
    days.set(l.date, d);
  }
  for (const e of exercises) {
    const d = days.get(e.date) ?? { eaten: 0, burned: 0 };
    d.burned += toNum(e.caloriesBurned);
    days.set(e.date, d);
  }
  return [...days.entries()]
    .map(([date, { eaten, burned }]) => ({
      date,
      eaten: Math.round(eaten),
      burned: Math.round(burned),
      deficit: Math.round(BASE_TDEE + burned - eaten),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
