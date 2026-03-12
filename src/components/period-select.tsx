"use client";

import { useRouter } from "next/navigation";

type PeriodOption = {
  value: string;
  label: string;
};

export function PeriodSelect({
  periods,
  currentValue,
}: {
  periods: PeriodOption[];
  currentValue: string;
}) {
  const router = useRouter();

  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700">Donem Gecisi</span>
      <select
        value={currentValue}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/panel/defter?month=${e.target.value}`);
          }
        }}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </label>
  );
}
