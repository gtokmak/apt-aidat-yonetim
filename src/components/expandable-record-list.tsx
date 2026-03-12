"use client";

import { useState, type ReactNode } from "react";

type RecordItem = {
  id: string;
  summary: string;
  detail: ReactNode;
};

export function ExpandableRecordList({
  items,
  emptyText = "Kayit bulunamadi.",
  title,
  count,
}: {
  items: RecordItem[];
  emptyText?: string;
  title: string;
  count?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayCount = count ?? items.length;

  if (items.length === 0) {
    return (
      <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
          {emptyText}
        </p>
      </article>
    );
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {displayCount}
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {items.map((item) => {
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
    </article>
  );
}
