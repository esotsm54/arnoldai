// Single source of truth for TDEE and the daily deficit formula, so the AI
// tools, the Diary page, and the dashboard all agree on the same numbers.

// Fallback when the profile or a weight entry isn't available yet.
export const BASE_TDEE = 2730;

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export type ProfileInfo = {
  dateOfBirth: string;
  sex: string;
  heightMeters: string | number;
  activityLevel: string;
};

export type DailySummary = {
  date: string;
  eaten: number;
  burned: number;
  deficit: number;
  /** Running total of `deficit` from the earliest logged day through this one. */
  cumulativeDeficit: number;
};

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function ageOn(dateOfBirth: string, onDate: Date): number {
  const dob = new Date(`${dateOfBirth}T12:00:00`);
  let age = onDate.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    onDate.getMonth() < dob.getMonth() ||
    (onDate.getMonth() === dob.getMonth() && onDate.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

/**
 * Mifflin-St Jeor BMR × activity factor. Falls back to BASE_TDEE when the
 * profile or weight is missing/invalid.
 */
export function computeTdee(profile: ProfileInfo | null, weightKg: number | null): number {
  if (!profile || !weightKg || weightKg <= 0) return BASE_TDEE;
  const heightCm = toNum(profile.heightMeters) * 100;
  const age = ageOn(profile.dateOfBirth, new Date());
  if (!heightCm || age <= 0) return BASE_TDEE;
  const sexOffset = profile.sex === "female" ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const factor = ACTIVITY_FACTORS[profile.activityLevel] ?? 1.2;
  return Math.round(bmr * factor);
}

/** Latest body entry (by day) that has a weight, or null. */
export function latestWeightKg(
  bodyEntries: Array<{ day: string; weightKg: string | number | null }>
): number | null {
  const withWeight = bodyEntries
    .filter((e) => toNum(e.weightKg) > 0)
    .sort((a, b) => b.day.localeCompare(a.day));
  return withWeight.length > 0 ? toNum(withWeight[0].weightKg) : null;
}

export function computeDailySummaries(
  logs: Array<{ date: string; calories: string | number }>,
  exercises: Array<{ date: string; caloriesBurned: string | number }>,
  tdee: number = BASE_TDEE
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
  // Accumulate oldest-to-newest so each day's running total is correct, then
  // present newest-first like the rest of the app.
  const ascending = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let running = 0;
  const summaries = ascending.map(([date, { eaten, burned }]) => {
    const deficit = Math.round(tdee + burned - eaten);
    running += deficit;
    return {
      date,
      eaten: Math.round(eaten),
      burned: Math.round(burned),
      deficit,
      cumulativeDeficit: running,
    };
  });
  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}
