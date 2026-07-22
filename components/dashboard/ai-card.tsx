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
  children,
}: {
  label: string;
  onClick: () => void;
  spinning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.2L20 9M19.5 12a7.5 7.5 0 0 1-13 5.2L4 15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
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
  onEdit,
  onRefresh,
  onDelete,
}: {
  card: DashboardCard;
  refreshing: boolean;
  onEdit: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{card.title}</h2>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton label="Editar prompt" onClick={onEdit}>
            <EditIcon />
          </IconButton>
          <IconButton label="Actualizar" onClick={onRefresh} spinning={refreshing}>
            <RefreshIcon />
          </IconButton>
          <IconButton label="Eliminar" onClick={onDelete}>
            <TrashIcon />
          </IconButton>
        </div>
      </div>
      <div className="mt-3">
        <CardBody card={card} />
      </div>
      {card.error && <p className="mt-2 text-xs text-red-500">⚠️ {card.error}</p>}
      <p className="mt-3 text-xs text-slate-400">{relativeTime(card.updatedAt)}</p>
    </section>
  );
}
