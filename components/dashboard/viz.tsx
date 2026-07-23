"use client";

import { useState } from "react";

const SERIES = "#2a78d6";
const GRID = "#e1e0d9";
const MUTED = "#898781";
const BASELINE = "#c3c2b7";

const W = 560;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export type Point = { label: string; value: number };

function niceMax(values: number[]): number {
  const max = Math.max(1, ...values);
  const pow = 10 ** Math.floor(Math.log10(max));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    if (max <= s * pow) return s * pow;
  }
  return 10 * pow;
}

export function LineViz({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return <EmptyViz />;
  const max = niceMax(points.map((p) => p.value));
  const x = (i: number) =>
    points.length > 1 ? PAD.left + (i / (points.length - 1)) * PW : PAD.left + PW / 2;
  const y = (v: number) => PAD.top + PH - (v / max) * PH;
  const linePoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${PAD.left},${PAD.top + PH} ${linePoints} ${PAD.left + PW},${PAD.top + PH}`;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((fx - PAD.left) / PW) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Line chart"
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={PAD.left + PW} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={MUTED}>
              {Math.round(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => i % labelEvery === 0 && (
          <text key={p.label + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={MUTED}>
            {p.label}
          </text>
        ))}
        <polygon points={area} fill={SERIES} opacity="0.08" />
        <polyline points={linePoints} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PH} stroke={BASELINE} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4.5" fill={SERIES} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <span className="opacity-70">{points[hover].label}</span>{" "}
          <span className="font-semibold">{points[hover].value}</span>
        </div>
      )}
    </div>
  );
}

export function BarViz({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return <EmptyViz />;
  const max = niceMax(points.map((p) => p.value));
  const bw = Math.min(28, (PW / points.length) * 0.6);
  const x = (i: number) => PAD.left + (i + 0.5) * (PW / points.length) - bw / 2;
  const y = (v: number) => PAD.top + PH - (v / max) * PH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={PAD.left + PW} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={MUTED}>
              {Math.round(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const bx = x(i);
          const by = y(p.value);
          const h = PAD.top + PH - by;
          const r = Math.min(4, h);
          return (
            <g key={p.label + i}>
              {p.value > 0 && (
                <path
                  d={`M${bx},${PAD.top + PH} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} Z`}
                  fill={SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <rect
                x={bx - 4}
                y={PAD.top}
                width={bw + 8}
                height={PH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % labelEvery === 0 && (
                <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={MUTED}>
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow"
          style={{ left: `${((x(hover) + bw / 2) / W) * 100}%` }}
        >
          <span className="opacity-70">{points[hover].label}</span>{" "}
          <span className="font-semibold">{points[hover].value}</span>
        </div>
      )}
    </div>
  );
}

const LINE_COLORS = ["#e0a83e", "#5fb87a", "#c65b5b", "#8a6fd1"];

export type ComboSeries = { label: string; values: number[] };

function niceDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(0, ...values);
  if (min >= 0) return [0, niceMax(values)];
  const bound = niceMax(values.map(Math.abs));
  return [-bound, bound];
}

export function ComboViz({
  categories,
  bar,
  lines,
}: {
  categories: string[];
  bar?: ComboSeries | null;
  lines: ComboSeries[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (categories.length === 0) return <EmptyViz />;

  const allValues = [...(bar?.values ?? []), ...lines.flatMap((l) => l.values)];
  const [domainMin, domainMax] = niceDomain(allValues);
  const x = (i: number) =>
    categories.length > 1 ? PAD.left + (i / (categories.length - 1)) * PW : PAD.left + PW / 2;
  const y = (v: number) => PAD.top + PH - ((v - domainMin) / (domainMax - domainMin)) * PH;
  const bw = Math.min(28, (PW / categories.length) * 0.6);
  const barX = (i: number) => PAD.left + (i + 0.5) * (PW / categories.length) - bw / 2;
  const ticks = [domainMin, domainMin + (domainMax - domainMin) / 2, domainMax];
  const labelEvery = Math.max(1, Math.ceil(categories.length / 6));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((fx - PAD.left) / PW) * (categories.length - 1));
    setHover(Math.max(0, Math.min(categories.length - 1, i)));
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Combo chart"
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={PAD.left + PW} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={MUTED}>
              {Math.round(t)}
            </text>
          </g>
        ))}
        {categories.map((c, i) => i % labelEvery === 0 && (
          <text key={c + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={MUTED}>
            {c}
          </text>
        ))}
        {bar && bar.values.map((v, i) => {
          const bx = barX(i);
          const zero = y(0);
          const top = Math.min(zero, y(v));
          const h = Math.abs(y(v) - zero);
          return (
            <rect
              key={i}
              x={bx}
              y={top}
              width={bw}
              height={Math.max(h, 1)}
              rx={2}
              fill={SERIES}
              opacity={hover === null || hover === i ? 0.55 : 0.25}
            />
          );
        })}
        {lines.map((line, li) => {
          const color = LINE_COLORS[li % LINE_COLORS.length];
          const linePoints = line.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <polyline
              key={line.label}
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PH} stroke={BASELINE} strokeWidth="1" strokeDasharray="3 3" />
        )}
        {hover !== null && lines.map((line, li) => (
          <circle
            key={line.label}
            cx={x(hover)}
            cy={y(line.values[hover])}
            r="4"
            fill={LINE_COLORS[li % LINE_COLORS.length]}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
        {hover !== null && bar && (
          <circle cx={barX(hover) + bw / 2} cy={y(bar.values[hover])} r="4" fill={SERIES} stroke="#fff" strokeWidth="2" />
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-lg bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="opacity-70">{categories[hover]}</p>
          {bar && (
            <p>
              <span className="opacity-70">{bar.label}:</span> <span className="font-semibold">{bar.values[hover]}</span>
            </p>
          )}
          {lines.map((line, li) => (
            <p key={line.label}>
              <span style={{ color: LINE_COLORS[li % LINE_COLORS.length] }}>{line.label}:</span>{" "}
              <span className="font-semibold">{line.values[hover]}</span>
            </p>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {bar && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />
            {bar.label}
          </span>
        )}
        {lines.map((line, li) => (
          <span key={line.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: LINE_COLORS[li % LINE_COLORS.length] }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TableViz({
  columns,
  rows,
  expanded,
}: {
  columns: string[];
  rows: string[][];
  expanded?: boolean;
}) {
  if (rows.length === 0) return <EmptyViz />;
  return (
    <div className={`thin-scroll -mx-1 overflow-y-auto overflow-x-auto ${expanded ? "max-h-[70vh]" : "max-h-72"}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white/90 backdrop-blur-sm">
          <tr className="border-b border-black/5">
            {columns.map((c, i) => (
              <th key={i} className="px-1 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black/5 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-1 py-2 text-slate-800 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatViz({
  value,
  unit,
  caption,
}: {
  value: string;
  unit?: string | null;
  caption?: string | null;
}) {
  // The model occasionally embeds the unit in `value` too (e.g. value:
  // "1,489 kcal", unit: "kcal") — drop the redundant unit rather than
  // showing it twice.
  const showUnit = unit && !value.trim().toLowerCase().endsWith(unit.trim().toLowerCase());
  return (
    <div>
      <p className="text-3xl font-bold text-slate-900">
        {value} {showUnit && <span className="text-lg font-normal text-slate-400">{unit}</span>}
      </p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

export type StatItem = { label: string; value: string; unit?: string | null };

export function StatsGridViz({ stats }: { stats: StatItem[] }) {
  if (stats.length === 0) return <EmptyViz />;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {stats.map((s, i) => {
        const showUnit = s.unit && !s.value.trim().toLowerCase().endsWith(s.unit.trim().toLowerCase());
        return (
          <div key={i}>
            <p className="text-xl font-bold text-slate-900">
              {s.value} {showUnit && <span className="text-sm font-normal text-slate-400">{s.unit}</span>}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function EmptyViz() {
  return <p className="text-sm text-slate-400">No hay datos para mostrar.</p>;
}
