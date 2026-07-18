"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  DetailRow,
  primaryButtonClass,
  ghostButtonClass,
  num,
} from "@/components/ui";
import { FoodLogFormModal } from "./food-log-form";
import { ExerciseFormModal } from "./exercise-form";
import type { LogEntry, ExerciseEntry } from "./types";
import { toNum } from "./types";

// Base TDEE from the user's personal rules; daily deficit = TDEE + burned - eaten
const BASE_TDEE = 2730;

const MEAL_ORDER: { type: LogEntry["mealType"]; label: string }[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snacks" },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// "Today" / "Tomorrow" / "Yesterday", otherwise the weekday name
function dayLabel(date: string): string {
  const today = todayStr();
  if (date === today) return "Today";
  if (date === shiftDate(today, 1)) return "Tomorrow";
  if (date === shiftDate(today, -1)) return "Yesterday";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

type View =
  | { type: "logDetail"; entry: LogEntry }
  | { type: "logForm"; entry?: LogEntry }
  | { type: "exDetail"; entry: ExerciseEntry }
  | { type: "exForm"; entry?: ExerciseEntry }
  | null;

const cardClass =
  "rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm";

export function DiaryDay() {
  const [date, setDate] = useState(todayStr());
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(null);

  async function load() {
    try {
      const [logRes, exRes] = await Promise.all([
        fetch("/api/arnold/log"),
        fetch("/api/arnold/exercise"),
      ]);
      if (!logRes.ok || !exRes.ok) throw new Error("Could not load diary data");
      setLogs(await logRes.json());
      setExercises(await exRes.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load diary data");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dayLogs = useMemo(
    () => (logs ?? []).filter((l) => l.date === date),
    [logs, date]
  );
  const dayExercises = useMemo(
    () => (exercises ?? []).filter((e) => e.date === date),
    [exercises, date]
  );

  const eaten = dayLogs.reduce((s, l) => s + toNum(l.calories), 0);
  const burned = dayExercises.reduce((s, e) => s + toNum(e.caloriesBurned), 0);
  const deficit = BASE_TDEE + burned - eaten;
  const protein = dayLogs.reduce((s, l) => s + toNum(l.protein), 0);
  const fat = dayLogs.reduce((s, l) => s + toNum(l.fat), 0);
  const carbs = dayLogs.reduce((s, l) => s + toNum(l.carbohydrates), 0);
  const sodium = dayLogs.reduce((s, l) => s + toNum(l.sodium), 0);

  const loading = (!logs || !exercises) && !error;

  return (
    <div className="flex flex-col gap-4">
      {/* Date navigation */}
      <div className={`${cardClass} flex items-center justify-between gap-2 p-2`}>
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          aria-label="Previous day"
          className="rounded-full p-2.5 text-slate-500 hover:bg-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {
                // some browsers only open the picker via the native indicator
              }
            }}
            className="date-plain w-[12ch] cursor-pointer rounded-xl bg-transparent px-0 py-1.5 text-center text-sm font-medium text-slate-900 outline-none"
          />
          <span className="text-xs text-slate-500">{dayLabel(date)}</span>
        </div>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          aria-label="Next day"
          className="rounded-full p-2.5 text-slate-500 hover:bg-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading diary…</p>}

      {!loading && !error && (
        <>
          {/* Summary */}
          <section className={`${cardClass} p-5`}>
            <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">Eaten</p>
                <p className="text-2xl font-bold text-slate-900">{Math.round(eaten)}</p>
                <p className="text-xs text-slate-400">kcal</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Burned</p>
                <p className="text-2xl font-bold text-slate-900">{Math.round(burned)}</p>
                <p className="text-xs text-slate-400">kcal</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Deficit</p>
                <p className={`text-2xl font-bold ${deficit >= 0 ? "text-[#006300]" : "text-red-500"}`}>
                  {Math.round(deficit)}
                </p>
                <p className="text-xs text-slate-400">kcal (TDEE {BASE_TDEE})</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 border-t border-black/5 pt-3">
              {[
                ["Protein", `${Math.round(protein)} g`],
                ["Fat", `${Math.round(fat)} g`],
                ["Carbs", `${Math.round(carbs)} g`],
                ["Sodium", `${Math.round(sodium)} mg`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Food */}
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Food</h2>
              <button onClick={() => setView({ type: "logForm" })} className="rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-slate-700">
                + Add
              </button>
            </div>
            {dayLogs.length === 0 && (
              <p className="mt-3 text-sm text-slate-400">Nothing logged this day.</p>
            )}
            {MEAL_ORDER.map(({ type, label }) => {
              const entries = dayLogs.filter((l) => l.mealType === type);
              if (entries.length === 0) return null;
              const mealTotal = entries.reduce((s, l) => s + toNum(l.calories), 0);
              return (
                <div key={type} className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium uppercase tracking-wide">{label}</span>
                    <span>{Math.round(mealTotal)} kcal</span>
                  </div>
                  <ul className="mt-1 divide-y divide-black/5">
                    {entries.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => setView({ type: "logDetail", entry: l })}
                          className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-white/60 rounded-lg px-2 -mx-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{l.foodName}</p>
                            <p className="text-xs text-slate-500">
                              {num(l.weightAmount)} {l.weightUnit}
                            </p>
                          </div>
                          <span className="text-sm text-slate-600 shrink-0">{num(l.calories)} kcal</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          {/* Exercise */}
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Exercise</h2>
              <button onClick={() => setView({ type: "exForm" })} className="rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-slate-700">
                + Add
              </button>
            </div>
            {dayExercises.length === 0 && (
              <p className="mt-3 text-sm text-slate-400">No exercise this day.</p>
            )}
            {dayExercises.length > 0 && (
              <ul className="mt-2 divide-y divide-black/5">
                {dayExercises.map((ex) => (
                  <li key={ex.id}>
                    <button
                      onClick={() => setView({ type: "exDetail", entry: ex })}
                      className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-white/60 rounded-lg px-2 -mx-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{ex.name}</p>
                        <p className="text-xs text-slate-500">{ex.durationMinutes} min</p>
                      </div>
                      <span className="text-sm text-slate-600 shrink-0">{num(ex.caloriesBurned)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      {view?.type === "logDetail" && (
        <Modal title={view.entry.foodName} onClose={() => setView(null)}>
          <div>
            <DetailRow label="Meal" value={view.entry.mealType} />
            <DetailRow label="Amount" value={`${num(view.entry.weightAmount)} ${view.entry.weightUnit}`} />
            <DetailRow label="Calories" value={`${num(view.entry.calories)} kcal`} />
            <DetailRow label="Protein" value={`${num(view.entry.protein)} g`} />
            <DetailRow label="Fat" value={`${num(view.entry.fat)} g`} />
            <DetailRow label="Carbohydrates" value={`${num(view.entry.carbohydrates)} g`} />
            <DetailRow label="Sodium" value={`${num(view.entry.sodium)} mg`} />
          </div>
          {view.entry.notes && (
            <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{view.entry.notes}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ type: "logForm", entry: view.entry })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}
      {view?.type === "logForm" && (
        <FoodLogFormModal
          initial={view.entry}
          defaultDate={date}
          onClose={() => setView(null)}
          onSaved={async () => {
            setView(null);
            await load();
          }}
        />
      )}
      {view?.type === "exDetail" && (
        <Modal title={view.entry.name} onClose={() => setView(null)}>
          <div>
            <DetailRow label="Date" value={view.entry.date} />
            <DetailRow label="Duration" value={`${view.entry.durationMinutes} min`} />
            <DetailRow label="Calories burned" value={`${num(view.entry.caloriesBurned)} kcal`} />
          </div>
          {view.entry.notes && (
            <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{view.entry.notes}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={() => setView({ type: "exForm", entry: view.entry })} className={primaryButtonClass}>
              Edit
            </button>
            <button onClick={() => setView(null)} className={ghostButtonClass}>
              Close
            </button>
          </div>
        </Modal>
      )}
      {view?.type === "exForm" && (
        <ExerciseFormModal
          initial={view.entry}
          defaultDate={date}
          onClose={() => setView(null)}
          onSaved={async () => {
            setView(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
