import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { requireAuth } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { formatDate, formatMoney, monthLabel, sumByAmount } from "@/lib/utils";

type PaymentRow = {
  id: string;
  apartment_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  apartments: {
    number: number;
    label: string;
  } | null;
};

type ExpenseRow = {
  id: string;
  category: string;
  title: string;
  amount: number;
  spent_at: string;
  note: string | null;
};

type AmountRow = {
  amount: number | null;
};

type AssessmentRow = {
  id: string;
  title: string;
  per_apartment_amount: number;
  due_date: string;
};

type PeriodRow = {
  period_month: string;
};

type Apartment = {
  id: string;
  number: number;
  label: string;
};

function formatMonthInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function addMonths(baseDate: Date, monthOffset: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
}

function parseSelectedMonth(monthParam?: string) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [yearText, monthText] = monthParam.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function getMonthRange(monthStart: Date) {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  return {
    start,
    end,
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  };
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const selectedMonthStart = parseSelectedMonth(params.month);
  const selectedMonthValue = formatMonthInputValue(selectedMonthStart);
  const prevMonth = formatMonthInputValue(addMonths(selectedMonthStart, -1));
  const nextMonth = formatMonthInputValue(addMonths(selectedMonthStart, 1));
  const { supabase } = await requireAuth();
  const { startIso, endIso } = getMonthRange(selectedMonthStart);

  const [
    paymentsResult,
    expensesResult,
    monthIncomeResult,
    monthExpenseResult,
    assessmentsResult,
    periodsResult,
    apartmentsResult,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, apartment_id, amount, paid_at, note, apartments(number, label)")
      .gte("paid_at", startIso)
      .lte("paid_at", endIso)
      .order("paid_at", { ascending: true })
      .returns<PaymentRow[]>(),
    supabase
      .from("expenses")
      .select("id, category, title, amount, spent_at, note")
      .gte("spent_at", startIso)
      .lte("spent_at", endIso)
      .order("spent_at", { ascending: true })
      .returns<ExpenseRow[]>(),
    supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", startIso)
      .lte("paid_at", endIso)
      .returns<AmountRow[]>(),
    supabase
      .from("expenses")
      .select("amount")
      .gte("spent_at", startIso)
      .lte("spent_at", endIso)
      .returns<AmountRow[]>(),
    supabase
      .from("special_assessments")
      .select("id, title, per_apartment_amount, due_date")
      .gte("due_date", startIso)
      .lte("due_date", endIso)
      .order("due_date", { ascending: true })
      .returns<AssessmentRow[]>(),
    supabase
      .from("periods")
      .select("period_month")
      .order("period_month", { ascending: false })
      .returns<PeriodRow[]>(),
    supabase
      .from("apartments")
      .select("id, number, label")
      .order("number", { ascending: true })
      .returns<Apartment[]>(),
  ]);

  const apartments = apartmentsResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const assessments = assessmentsResult.data ?? [];

  const totalIncome = sumByAmount(monthIncomeResult.data);
  const totalExpense = sumByAmount(monthExpenseResult.data);
  const net = totalIncome - totalExpense;
  const periodLinks = (periodsResult.data ?? []).map((period) => ({
    value: period.period_month.slice(0, 7),
    label: monthLabel(new Date(period.period_month)),
  }));

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Aylik Defter
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">
        {monthLabel(selectedMonthStart)} Gelir Gider
      </h1>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Ay Secimi</span>
              <input
                type="month"
                name="month"
                defaultValue={selectedMonthValue}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <SubmitButton
              pendingText="Yukleniyor..."
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Goster
            </SubmitButton>
          </form>

          <Link
            href={`/panel/defter?month=${prevMonth}`}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold leading-10 text-slate-700 hover:bg-slate-100"
          >
            Onceki Ay
          </Link>
          <Link
            href={`/panel/defter?month=${nextMonth}`}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold leading-10 text-slate-700 hover:bg-slate-100"
          >
            Sonraki Ay
          </Link>
        </div>

        {periodLinks.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {periodLinks.slice(0, 12).map((period) => (
              <Link
                key={period.value}
                href={`/panel/defter?month=${period.value}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  period.value === selectedMonthValue
                    ? "border-amber-300 bg-amber-100 text-amber-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {period.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-emerald-300">
          <header className="bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
            Gelir
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-emerald-50 text-emerald-900">
                <tr>
                  <th className="px-3 py-2 text-left">Apt No</th>
                  <th className="px-3 py-2 text-left">Isim</th>
                  <th className="px-3 py-2 text-left">Miktar</th>
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2 text-left">Aciklama</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Secili ay icin gelir kaydi yok.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-emerald-100">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {payment.apartments?.number ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {apartmentDisplayMap.get(payment.apartment_id)?.primaryResidentName ??
                          payment.apartments?.label ??
                          "-"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {formatMoney(Number(payment.amount))}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDate(payment.paid_at)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {payment.note ?? "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-rose-300">
          <header className="bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
            Gider
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-rose-50 text-rose-900">
                <tr>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">Baslik</th>
                  <th className="px-3 py-2 text-left">Miktar</th>
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2 text-left">Aciklama</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Secili ay icin gider kaydi yok.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-rose-100">
                      <td className="px-3 py-2 text-slate-700">{expense.category}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {expense.title}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {formatMoney(Number(expense.amount))}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDate(expense.spent_at)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {expense.note ?? "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-emerald-500 text-white">
                <td className="px-4 py-2 font-semibold">Gelir</td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatMoney(totalIncome)}
                </td>
              </tr>
              <tr className="bg-rose-500 text-white">
                <td className="px-4 py-2 font-semibold">Gider</td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatMoney(totalExpense)}
                </td>
              </tr>
              <tr className="bg-amber-300 text-slate-900">
                <td className="px-4 py-2 font-semibold">Toplam</td>
                <td className="px-4 py-2 text-right font-semibold">
                  {formatMoney(net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Secili Ay Ek Gider Kararlari
          </h2>
          {assessments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Kayit bulunmuyor.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {assessments.map((assessment) => (
                <li
                  key={assessment.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="font-semibold text-slate-900">{assessment.title}</p>
                  <p>
                    Daire Basi: {formatMoney(Number(assessment.per_apartment_amount))}
                  </p>
                  <p>Vade: {formatDate(assessment.due_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
