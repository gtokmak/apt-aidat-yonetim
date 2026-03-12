"use client";

import { useState, type ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

export function SectionTabs({
  tabs,
  label = "Islem secin",
}: {
  tabs: Tab[];
  label?: string;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Mobile: styled select dropdown */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-1 backdrop-blur sm:-mx-5 sm:px-5 md:hidden">
        <select
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          className="h-12 w-full rounded-xl border-2 border-amber-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          aria-label={label}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: horizontal tab pills */}
      <div className="hidden flex-wrap gap-2 md:flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              activeId === tab.id
                ? "border-amber-300 bg-amber-50 text-amber-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="mt-5">
        {tabs.map((tab) => (
          <div key={tab.id} className={activeId === tab.id ? "" : "hidden"}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
