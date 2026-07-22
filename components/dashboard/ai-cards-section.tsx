"use client";

import { useEffect, useState } from "react";
import { AiCard } from "./ai-card";
import { AiCardFormModal } from "./ai-card-form";
import type { DashboardCard, VizType } from "@/lib/dashboard-store";

type View = { mode: "create" } | { mode: "edit"; card: DashboardCard } | null;

export function AiCardsSection() {
  const [cards, setCards] = useState<DashboardCard[] | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [view, setView] = useState<View>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/dashboard-cards");
      if (!res.ok) throw new Error("No se pudieron cargar las tarjetas");
      setCards(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las tarjetas");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setRefreshing(id: string, on: boolean) {
    setRefreshingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refreshOne(id: string) {
    setRefreshing(id, true);
    try {
      const res = await fetch(`/api/dashboard-cards/${id}/refresh`, { method: "POST" });
      const updated = await res.json();
      setCards((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)));
    } catch {
      // The card itself already carries its own error state from the server.
    } finally {
      setRefreshing(id, false);
    }
  }

  async function refreshAll() {
    if (!cards || cards.length === 0) return;
    setRefreshingAll(true);
    await Promise.all(cards.map((c) => refreshOne(c.id)));
    setRefreshingAll(false);
  }

  async function createCard(fields: { title: string; prompt: string; vizType: VizType }) {
    const res = await fetch("/api/dashboard-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("No se pudo crear la tarjeta");
    const card = await res.json();
    setCards((prev) => [...(prev ?? []), card]);
    setView(null);
  }

  async function editCard(id: string, fields: { title: string; prompt: string; vizType: VizType }) {
    const res = await fetch(`/api/dashboard-cards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("No se pudo guardar");
    const updated = await res.json();
    setCards((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)));
    setView(null);
  }

  async function deleteCard(id: string) {
    setCards((prev) => (prev ?? []).filter((c) => c.id !== id));
    await fetch(`/api/dashboard-cards/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-2">
          {cards && cards.length > 0 && (
            <button
              onClick={refreshAll}
              disabled={refreshingAll}
              className="rounded-full bg-white/75 ring-1 ring-black/5 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-50"
            >
              {refreshingAll ? "Actualizando…" : "Actualizar todos"}
            </button>
          )}
          <button
            onClick={() => setView({ mode: "create" })}
            className="rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-slate-700"
          >
            + Agregar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!cards && !error && <p className="text-sm text-slate-400">Cargando tarjetas…</p>}
      {cards && cards.length === 0 && (
        <p className="text-sm text-slate-400">
          Aún no tienes tarjetas. Crea una con &ldquo;+ Agregar&rdquo; y descríbele qué datos quieres ver.
        </p>
      )}

      {cards && cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <AiCard
              key={card.id}
              card={card}
              refreshing={refreshingIds.has(card.id)}
              onEdit={() => setView({ mode: "edit", card })}
              onRefresh={() => refreshOne(card.id)}
              onDelete={() => deleteCard(card.id)}
            />
          ))}
        </div>
      )}

      {view?.mode === "create" && (
        <AiCardFormModal onClose={() => setView(null)} onSaved={createCard} />
      )}
      {view?.mode === "edit" && (
        <AiCardFormModal
          initial={view.card}
          onClose={() => setView(null)}
          onSaved={(fields) => editCard(view.card.id, fields)}
        />
      )}
    </div>
  );
}
