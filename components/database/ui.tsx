"use client";

export const inputClass =
  "w-full rounded-xl bg-white/80 ring-1 ring-black/10 px-4 py-2.5 text-sm outline-none focus:ring-slate-400";

export const primaryButtonClass =
  "rounded-full bg-slate-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50";

export const ghostButtonClass =
  "rounded-full ring-1 ring-black/10 text-slate-700 px-6 py-2.5 text-sm hover:bg-slate-100";

// Strips the API's trailing decimals: "374.00" -> "374", "6.30" -> "6.3"
export function num(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? "—" : String(n);
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#f6f8f8] shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-black/5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm text-slate-700 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
