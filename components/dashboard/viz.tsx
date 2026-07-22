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

export function TableViz({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) return <EmptyViz />;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
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
  return (
    <div>
      <p className="text-3xl font-bold text-slate-900">
        {value} {unit && <span className="text-lg font-normal text-slate-400">{unit}</span>}
      </p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

function EmptyViz() {
  return <p className="text-sm text-slate-400">No hay datos para mostrar.</p>;
}
