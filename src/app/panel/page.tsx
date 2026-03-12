import { requireAuth } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import {
  formatMoney,
  getCurrentMonthRange,
  monthLabel,
  sumByAmount,
} from "@/lib/utils";

type AmountRow = {
  amount: number | null;
};

type Apartment = {
  id: string;
  number: number;
  label: string;
};

type BalanceRow = {
  apartment_id: string;
  total_charges: number;
  total_payments: number;
  balance: number;
};

type FinanceSettingsRow = {
  opening_carry_over: number;
};

export default async function PanelHomePage() {
  const { supabase } = await requireAuth();
  const { startIso, endIso, start } = getCurrentMonthRange();

  const [
    monthPaymentsResult,
    monthExpensesResult,
    monthChargesResult,
    beforePaymentsResult,
    beforeExpensesResult,
    totalPaymentsResult,
    totalExpensesResult,
    totalChargesResult,
    apartmentsResult,
    balancesResult,
    settingsResult,
  ] = await Promise.all([
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
      .from("charges")
      .select("amount")
      .gte("due_date", startIso)
      .lte("due_date", endIso)
      .returns<AmountRow[]>(),
    supabase
      .from("payments")
      .select("amount")
      .lt("paid_at", startIso)
      .returns<AmountRow[]>(),
    supabase
      .from("expenses")
      .select("amount")
      .lt("spent_at", startIso)
      .returns<AmountRow[]>(),
    supabase.from("payments").select("amount").returns<AmountRow[]>(),
    supabase.from("expenses").select("amount").returns<AmountRow[]>(),
    supabase.from("charges").select("amount").returns<AmountRow[]>(),
    supabase
      .from("apartments")
      .select("id, number, label")
      .order("number", { ascending: true })
      .returns<Apartment[]>(),
    supabase
      .from("apartment_balance_summary")
      .select("apartment_id, total_charges, total_payments, balance")
      .returns<BalanceRow[]>(),
    supabase
      .from("finance_settings")
      .select("opening_carry_over")
      .eq("id", 1)
      .maybeSingle<FinanceSettingsRow>(),
  ]);

  const monthIncome = sumByAmount(monthPaymentsResult.data);
  const monthExpense = sumByAmount(monthExpensesResult.data);
  const monthExpected = sumByAmount(monthChargesResult.data);
  const monthNet = monthIncome - monthExpense;

  const totalIncome = sumByAmount(totalPaymentsResult.data);
  const totalExpense = sumByAmount(totalExpensesResult.data);
  const totalExpected = sumByAmount(totalChargesResult.data);
  const openingCarryOver = Number(settingsResult.data?.opening_carry_over ?? 0);

  const carryIncome = sumByAmount(beforePaymentsResult.data);
  const carryExpense = sumByAmount(beforeExpensesResult.data);
  const carryOver = openingCarryOver + (carryIncome - carryExpense);
  const cashOnHand = openingCarryOver + (totalIncome - totalExpense);

  const apartments = apartmentsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);
  const balanceMap = new Map(balances.map((row) => [row.apartment_id, row]));

  const apartmentRows = apartments.map((apartment) => {
    const row = balanceMap.get(apartment.id);
    const display = apartmentDisplayMap.get(apartment.id);

    return {
      ...apartment,
      displayText: display?.displayText ?? `${apartment.number}. Daire ${apartment.label}`,
      totalCharges: Number(row?.total_charges ?? 0),
      totalPayments: Number(row?.total_payments ?? 0),
      balance: Number(row?.balance ?? 0),
    };
  });

  const debtCount = apartmentRows.filter((row) => row.balance > 0).length;
  const creditCount = apartmentRows.filter((row) => row.balance < 0).length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Genel Durum
          </p>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {monthLabel()} Ozeti
          </h1>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">
            Toplanan Toplam Gelir
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-900 sm:text-2xl">
            {formatMoney(totalIncome)}
          </p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs uppercase tracking-wide text-rose-700">Toplam Gider</p>
          <p className="mt-2 text-xl font-semibold text-rose-900 sm:text-2xl">
            {formatMoney(totalExpense)}
          </p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">
            Beklenen Aidat
          </p>
          <p className="mt-2 text-xl font-semibold text-amber-900 sm:text-2xl">
            {formatMoney(totalExpected)}
          </p>
        </article>
        <article className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-700">Devir</p>
          <p className="mt-2 text-xl font-semibold text-sky-900 sm:text-2xl">
            {formatMoney(carryOver)}
          </p>
        </article>
        <article className="rounded-xl border border-slate-300 bg-slate-100 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-700">Kasada Kalan</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatMoney(cashOnHand)}
          </p>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Icinde Bulunulan Ay Ozeti
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ay Gelir</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(monthIncome)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ay Gider</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(monthExpense)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Ay Beklenen Aidat
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(monthExpected)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ay Net</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(monthNet)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Borclu Daire</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{debtCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">On Odemeli Daire</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{creditCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Donem Baslangici
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {new Intl.DateTimeFormat("tr-TR").format(start)}
          </p>
        </div>
      </div>

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-3">Daire</th>
              <th className="px-4 py-3">Toplam Borc</th>
              <th className="px-4 py-3">Toplam Odeme</th>
              <th className="px-4 py-3">Bakiye</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {apartmentRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Bu hesap icin goruntulenecek daire bulunamadi.
                </td>
              </tr>
            ) : (
              apartmentRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.displayText}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.totalCharges)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.totalPayments)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatMoney(row.balance)}
                  </td>
                  <td className="px-4 py-3">
                    {row.balance > 0 ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                        Borclu
                      </span>
                    ) : row.balance < 0 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        On Odemeli
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        Esit
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
