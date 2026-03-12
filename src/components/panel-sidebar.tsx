"use client";

import { useState, useCallback, type ReactNode, type MouseEvent } from "react";

export function PanelSidebar({
  userName,
  children,
}: {
  userName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleContentClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Close sidebar when a nav link is clicked on mobile
      if (target.closest("a[href]")) {
        setOpen(false);
      }
    },
    [],
  );

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur">
      {/* Mobile: compact header with toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 md:hidden"
        aria-expanded={open}
        aria-label="Paneli ac/kapat"
      >
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Apartman Paneli
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
            {userName}
          </p>
        </div>
        <span
          className={`ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Content: togglable on mobile, always visible on desktop */}
      <div
        onClick={handleContentClick}
        className={`${open ? "block" : "hidden"} overflow-hidden border-t border-slate-100 p-4 sm:p-5 md:block md:border-0 md:p-5`}
      >
        {children}
      </div>
    </aside>
  );
}
