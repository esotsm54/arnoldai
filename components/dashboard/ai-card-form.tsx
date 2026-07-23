"use client";

import { useState } from "react";
import { Modal, Field, inputClass, primaryButtonClass, ghostButtonClass } from "@/components/ui";
import type { VizType } from "@/lib/dashboard-store";

const VIZ_OPTIONS: { value: VizType; label: string }[] = [
  { value: "table", label: "Tabla" },
  { value: "line", label: "Línea" },
  { value: "bar", label: "Barras" },
  { value: "stat", label: "Número" },
  { value: "stats", label: "Varios números" },
  { value: "combo", label: "Combinada (barras + líneas)" },
];

export function AiCardFormModal({
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  initial?: { title: string; prompt: string; vizType: VizType };
  onClose: () => void;
  onSaved: (fields: { title: string; prompt: string; vizType: VizType }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [vizType, setVizType] = useState<VizType>(initial?.vizType ?? "table");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !prompt.trim()) {
      setError("Ponle un título y un prompt.");
      return;
    }
    setSaving(true);
    try {
      await onSaved({ title: title.trim(), prompt: prompt.trim(), vizType });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <Modal title={initial ? "Editar tarjeta" : "Nueva tarjeta"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Calorías ahorradas por día"
          />
        </Field>
        <Field label="Tipo de visualización">
          <select
            value={vizType}
            onChange={(e) => setVizType(e.target.value as VizType)}
            className={inputClass}
          >
            {VIZ_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prompt">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="Muéstrame las calorías ahorradas (déficit) de cada día registrado"
          />
        </Field>
        <p className="text-xs text-slate-400">
          Arnold solo puede leer tus datos para esto — no puede agregar ni editar nada.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear tarjeta"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancelar
          </button>
        </div>
      </form>

      {onDelete && (
        <div className="mt-5 border-t border-black/5 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Eliminar tarjeta
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-700">
                ¿Seguro que quieres eliminar esta tarjeta? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-full bg-red-500 text-white px-6 py-2.5 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className={ghostButtonClass}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
