"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  );
}

function DiaryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17.5H7.5A2.5 2.5 0 0 0 5 22V4.5Z" />
      <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19" />
      <path d="M9 7h6" />
    </svg>
  );
}

function SparklesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15l.95 2.55L22.5 18.5l-2.55.95L19 22l-.95-2.55-2.55-.95 2.55-.95L19 15Z" />
      <path d="M5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
    </svg>
  );
}

function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13" />
      <path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z" />
    </svg>
  );
}

const items = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/diary", label: "Diary", Icon: DiaryIcon },
  { href: "/chat", label: "AI Chat", Icon: SparklesIcon, special: true },
  { href: "/database", label: "Database", Icon: DatabaseIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: floating glass pill at the bottom */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-50 flex items-center justify-between rounded-full bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/10 ring-1 ring-black/5 px-3 py-2">
        {items.map(({ href, label, Icon, special }) => {
          const active = pathname.startsWith(href);
          if (special) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`-translate-y-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-600/40 ring-4 ring-white/80 transition-transform active:scale-95 ${
                  active ? "scale-105" : ""
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex items-center gap-2 rounded-full transition-colors ${
                active
                  ? "bg-[#f6ead8] text-slate-900 px-4 py-2.5 font-medium"
                  : "text-slate-500 hover:text-slate-800 p-2.5"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {active && <span className="text-sm">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: glass sidebar on the left */}
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 z-50 w-60 flex-col rounded-3xl bg-white/75 backdrop-blur-xl shadow-lg shadow-slate-900/10 ring-1 ring-black/5 p-4">
        <div className="flex items-center gap-3 px-2 pt-1 pb-6">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span className="font-bold text-slate-900">Arnold AI</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {items.map(({ href, label, Icon, special }) => {
            const active = pathname.startsWith(href);
            if (special) {
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 my-1 bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-medium shadow-md shadow-emerald-600/30 transition-transform hover:scale-[1.02] active:scale-95 ${
                    active ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-white/60" : ""
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                  active
                    ? "bg-[#f6ead8] text-slate-900 font-medium"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-800"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
