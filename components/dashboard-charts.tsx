"use client";

import { useState } from "react";

// Placeholder data until real sources exist
const activity = [
  { label: "Jul 5", value: 22 },
  { label: "Jul 6", value: 35 },
  { label: "Jul 7", value: 30 },
  { label: "Jul 8", value: 48 },
  { label: "Jul 9", value: 41 },
  { label: "Jul 10", value: 55 },
  { label: "Jul 11", value: 38 },
  { label: "Jul 12", value: 62 },
  { label: "Jul 13", value: 50 },
  { label: "Jul 14", value: 58 },
  { label: "Jul 15", value: 71 },
  { label: "Jul 16", value: 64 },
  { label: "Jul 17", value: 69 },
  { label: "Jul 18", value: 75 },
];

const sessions = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 1 },
  { label: "Fri", value: 2 },
  { label: "Sat", value: 3 },
  { label: "Sun", value: 1 },
];

const SERIES = "#2a78d6";
const GRID = "#e1e0d9";
const MUTED = "#898781";
const BASELINE = "#c3c2b7";

const W = 560;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function StatTiles() {
  const tiles = [
    { label: "Workouts this week", value: "5", delta: "+2 vs last week" },
    { label: "Active minutes", value: "342", delta: "+18% vs last week" },
    { label: "Day streak", value: "6", delta: "best: 11" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-5"
        >
          <p className="text-xs text-slate-500">{t.label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{t.value}</p>
          <p className="mt-1 text-xs font-medium text-[#006300]">{t.delta}</p>
        </div>
      ))}
    </div>
  );
}

export function ActivityLineChart() {
  const [hover, setHover] = useState<number | null>(null);
  const max = 80; // fixed nice max for placeholder data
  const x = (i: number) => PAD.left + (i / (activity.length - 1)) * PW;
  const y = (v: number) => PAD.top + PH - (v / max) * PH;
  const points = activity.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${PAD.left},${PAD.top + PH} ${points} ${PAD.left + PW},${PAD.top + PH}`;
  const ticks = [0, 20, 40, 60, 80];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((fx - PAD.left) / PW) * (activity.length - 1));
    setHover(Math.max(0, Math.min(activity.length - 1, i)));
  }

  return (
    <Card title="Active minutes" subtitle="Last 14 days">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Line chart of active minutes over the last 14 days"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + PW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? BASELINE : GRID}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y(t) + 3}
                textAnchor="end"
                fontSize="10"
                fill={MUTED}
              >
                {t}
              </text>
            </g>
          ))}
          {activity.map(
            (d, i) =>
              i % 3 === 0 && (
                <text
                  key={d.label}
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill={MUTED}
                >
                  {d.label}
                </text>
              )
          )}
          <polygon points={area} fill={SERIES} opacity="0.08" />
          <polyline
            points={points}
            fill="none"
            stroke={SERIES}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {hover !== null && (
            <>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + PH}
                stroke={BASELINE}
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={x(hover)}
                cy={y(activity[hover].value)}
                r="4.5"
                fill={SERIES}
                stroke="#fff"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <span className="opacity-70">{activity[hover].label}</span>{" "}
            <span className="font-semibold">{activity[hover].value} min</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function SessionsBarChart() {
  const [hover, setHover] = useState<number | null>(null);
  const max = 4;
  const bw = 22;
  const x = (i: number) =>
    PAD.left + (i + 0.5) * (PW / sessions.length) - bw / 2;
  const y = (v: number) => PAD.top + PH - (v / max) * PH;
  const ticks = [0, 1, 2, 3, 4];

  return (
    <Card title="Workouts" subtitle="This week">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Bar chart of workouts per day this week"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + PW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? BASELINE : GRID}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y(t) + 3}
                textAnchor="end"
                fontSize="10"
                fill={MUTED}
              >
                {t}
              </text>
            </g>
          ))}
          {sessions.map((d, i) => {
            const bx = x(i);
            const by = y(d.value);
            const h = PAD.top + PH - by;
            const r = Math.min(4, h);
            return (
              <g key={d.label}>
                {d.value > 0 && (
                  <path
                    d={`M${bx},${PAD.top + PH} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} Z`}
                    fill={SERIES}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {/* invisible hit target wider than the mark */}
                <rect
                  x={bx - 8}
                  y={PAD.top}
                  width={bw + 16}
                  height={PH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={bx + bw / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill={MUTED}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow"
            style={{ left: `${((x(hover) + bw / 2) / W) * 100}%` }}
          >
            <span className="opacity-70">{sessions[hover].label}</span>{" "}
            <span className="font-semibold">
              {sessions[hover].value}{" "}
              {sessions[hover].value === 1 ? "workout" : "workouts"}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
