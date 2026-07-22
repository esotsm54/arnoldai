"use client";

import { useState } from "react";
import { Modal, Field, inputClass, primaryButtonClass, ghostButtonClass } from "@/components/ui";
import type { VizType } from "@/lib/dashboard-store";

const VIZ_OPTIONS: { value: VizType; label: string }[] = [
  { value: "table", label: "Tabla" },
  { value: "line", label: "Línea" },
  { value: "bar", label: "Barras" },
  { value: "stat", label: "Número" },
];

export function AiCardFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: { title: string; prompt: string; vizType: VizType };
  onClose: () => void;
  onSaved: (fields: { title: string; prompt: string; vizType: VizType }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [vizType, setVizType] = useState<VizType>(initial?.vizType ?? "table");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    </Modal>
  );
}
