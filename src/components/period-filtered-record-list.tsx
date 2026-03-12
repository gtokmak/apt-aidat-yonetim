"use client";

import { useState, useMemo, type ReactNode } from "react";

type FilterableItem = {
  id: string;
  periodId: string | null;
  summary: string;
  detail: ReactNode;
};

type PeriodOption = {
  id: string;
  label: string;
};

export function PeriodFilteredRecordList({
  periods,
  items,
  title,
  emptyText = "Kayit bulunamadi.",
}: {
  periods: PeriodOption[];
  items: FilterableItem[];
  title: string;
  emptyText?: string;
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selectedPeriodId) return items;
    if (selectedPeriodId === "__none__") return items.filter((i) => !i.periodId);
    return items.filter((i) => i.periodId === selectedPeriodId);
  }, [items, selectedPeriodId]);

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {filtered.length}
        </span>
      </div>

      <div className="mt-3">
        <select
          value={selectedPeriodId}
          onChange={(e) => {
            setSelectedPeriodId(e.target.value);
            setExpandedId(null);
          }}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="__none__">Donemsiz Kayitlar</option>
          <option value="">Tum Kayitlar</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {filtered.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <div key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left text-sm transition hover:bg-slate-50"
                >
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="min-w-0 truncate text-slate-700">{item.summary}</span>
                </button>
                {isOpen ? (
                  <div className="overflow-x-auto border-t border-slate-100 bg-slate-50/50 px-3 py-3">
                    {item.detail}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
