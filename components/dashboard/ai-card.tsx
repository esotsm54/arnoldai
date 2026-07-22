"use client";

import { LineViz, BarViz, TableViz, StatViz } from "./viz";
import type { DashboardCard } from "@/lib/dashboard-store";

type TableData = { columns: string[]; rows: string[][] };
type PointsData = { points: { label: string; value: number }[] };
type StatData = { value: string; unit?: string | null; caption?: string | null };

function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca actualizado";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Actualizado justo ahora";
  if (mins < 60) return `Actualizado hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Actualizado hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Actualizado hace ${days} d`;
}

function IconButton({
  label,
  onClick,
  spinning,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  spinning?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <span className={spinning ? "animate-spin" : ""}>{children}</span>
    </button>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.2L20 9M19.5 12a7.5 7.5 0 0 1-13 5.2L4 15" />
    </svg>
  );
}

function CardBody({ card }: { card: DashboardCard }) {
  if (!card.data) {
    return (
      <p className="text-sm text-slate-400">
        {card.error ? "No se pudo cargar." : "Sin datos todavía — actualiza para generar."}
      </p>
    );
  }
  if (card.vizType === "table") {
    const { columns, rows } = card.data as TableData;
    return <TableViz columns={columns ?? []} rows={rows ?? []} />;
  }
  if (card.vizType === "line") {
    const { points } = card.data as PointsData;
    return <LineViz points={points ?? []} />;
  }
  if (card.vizType === "bar") {
    const { points } = card.data as PointsData;
    return <BarViz points={points ?? []} />;
  }
  const { value, unit, caption } = card.data as StatData;
  return <StatViz value={value ?? ""} unit={unit} caption={caption} />;
}

export function AiCard({
  card,
  refreshing,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRefresh,
}: {
  card: DashboardCard;
  refreshing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-900">{card.title}</h2>
      <div className="mt-1 flex items-center justify-end gap-2">
        <IconButton label="Subir" onClick={onMoveUp} disabled={isFirst}>
          <ArrowUpIcon />
        </IconButton>
        <IconButton label="Bajar" onClick={onMoveDown} disabled={isLast}>
          <ArrowDownIcon />
        </IconButton>
        <IconButton label="Editar prompt" onClick={onEdit}>
          <EditIcon />
        </IconButton>
        <IconButton label="Actualizar" onClick={onRefresh} spinning={refreshing}>
          <RefreshIcon />
        </IconButton>
      </div>
      <div className="mt-2">
        <CardBody card={card} />
      </div>
      {card.error && <p className="mt-2 text-xs text-red-500">⚠️ {card.error}</p>}
      <p className="mt-3 text-xs text-slate-400">{relativeTime(card.updatedAt)}</p>
    </section>
  );
}
