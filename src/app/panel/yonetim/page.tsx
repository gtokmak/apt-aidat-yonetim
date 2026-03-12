import Link from "next/link";

import { requireManager } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { SubmitButton } from "@/components/submit-button";
import { SectionTabs } from "@/components/section-tabs";
import { ExpandableRecordList } from "@/components/expandable-record-list";
import { PeriodFilteredRecordList } from "@/components/period-filtered-record-list";
import { formatDate, formatMoney, monthLabel } from "@/lib/utils";

import {
  addExpenseAction,
  addExpenseCategoryAction,
  addPaymentAction,
  createPeriodAction,
  createSpecialAssessmentAction,
  deleteExpenseAction,
  deleteExpenseCategoryAction,
  deletePaymentAction,
  setApartmentDueExemptionAction,
  setOpeningCarryOverAction,
  updateExpenseAction,
  updateExpenseCategoryAction,
  updatePaymentAction,
} from "./actions";

type Apartment = {
  id: string;
  number: number;
  label: string;
  is_dues_exempt: boolean;
};

type Period = {
  id: string;
  period_month: string;
  monthly_due: number;
};

type ExpenseCategory = {
  id: string;
  name: string;
  active: boolean;
};

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
  period_id: string | null;
  category_id: string | null;
  category: string;
  title: string;
  amount: number;
  spent_at: string;
  note: string | null;
};

type FinanceSettingsRow = {
  opening_carry_over: number;
};

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireManager();

  const [
    apartmentsResult,
    periodsResult,
    categoriesResult,
    paymentsResult,
    expensesResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("apartments")
      .select("id, number, label, is_dues_exempt")
      .order("number", { ascending: true })
      .returns<Apartment[]>(),
    supabase
      .from("periods")
      .select("id, period_month, monthly_due")
      .order("period_month", { ascending: false })
      .returns<Period[]>(),
    supabase
      .from("expense_categories")
      .select("id, name, active")
      .order("name", { ascending: true })
      .returns<ExpenseCategory[]>(),
    supabase
      .from("payments")
      .select("id, apartment_id, amount, paid_at, note, apartments(number, label)")
      .order("paid_at", { ascending: false })
      .returns<PaymentRow[]>(),
    supabase
      .from("expenses")
      .select("id, period_id, category_id, category, title, amount, spent_at, note")
      .order("spent_at", { ascending: false })
      .returns<ExpenseRow[]>(),
    supabase
      .from("finance_settings")
      .select("opening_carry_over")
      .eq("id", 1)
      .maybeSingle<FinanceSettingsRow>(),
  ]);

  const apartments = apartmentsResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);
  const periods = periodsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const activeCategories = categories.filter((category) => category.active);
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const openingCarryOver = Number(settingsResult.data?.opening_carry_over ?? 0);

  // Build period lookup map (YYYY-MM → period id) for payment matching
  const periodMonthMap = new Map(
    periods.map((p) => [p.period_month.slice(0, 7), p.id]),
  );

  function matchPaymentToPeriod(paidAt: string): string | null {
    const ym = paidAt.slice(0, 7); // "YYYY-MM"
    return periodMonthMap.get(ym) ?? null;
  }

  const periodOptions = periods.map((p) => ({
    id: p.id,
    label: monthLabel(new Date(p.period_month)),
  }));

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Yonetim
      </p>
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Yonetici Islemleri</h1>
      <p className="mt-2 text-sm text-slate-600">
        Aylik aidat, odeme, gider ve ek gider islemlerini buradan yonetin.
        Kullanici daveti ve kiraci devirleri icin{" "}
        <Link href="/panel/kullanicilar" className="font-semibold underline">
          Kullanicilar sayfasi
        </Link>{" "}
        kullanilir.
      </p>

      {params.error ? (
        <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {params.error}
        </p>
      ) : null}

      {params.success ? (
        <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {params.success}
        </p>
      ) : null}

      <div className="mt-6">
        <SectionTabs
          label="Yonetim islemi secin"
          tabs={[
            {
              id: "donem",
              label: "Donem & Devir",
              content: (
                <div className="grid gap-5 lg:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Gecen Yildan Devir Bakiye
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Kasaya gecen donemden devreden tutari bir kez girin.
                    </p>
                    <form action={setOpeningCarryOverAction} className="mt-4 grid gap-3">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Devir Tutar</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          name="openingCarryOver"
                          defaultValue={openingCarryOver}
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Mevcut devir: <span className="font-semibold">{formatMoney(openingCarryOver)}</span>
                      </p>
                      <SubmitButton
                        pendingText="Devir kaydediliyor..."
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Devri Kaydet
                      </SubmitButton>
                    </form>
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Aylik Aidat Donemi Ac
                    </h2>
                    <form action={createPeriodAction} className="mt-4 grid gap-3">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Donem (Ay)</span>
                        <input
                          required
                          type="month"
                          name="periodMonth"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Daire Basi Aidat</span>
                        <input
                          required
                          type="number"
                          min={1}
                          step="0.01"
                          name="monthlyDue"
                          placeholder="250"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Not</span>
                        <input
                          type="text"
                          name="notes"
                          placeholder="Opsiyonel not"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <SubmitButton
                        pendingText="Donem olusturuluyor..."
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Donemi Olustur
                      </SubmitButton>
                    </form>
                  </article>
                </div>
              ),
            },
            {
              id: "muafiyet",
              label: "Muafiyet & Ek Gider",
              content: (
                <div className="grid gap-5 lg:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Aidat Muafiyeti
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Muaf daireler yeni aylik aidat donemi acildiginda borclandirilmaz.
                    </p>
                    <div className="mt-4 space-y-2">
                      {apartments.map((apartment) => (
                        <form
                          key={`due-exempt-${apartment.id}`}
                          action={setApartmentDueExemptionAction}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <input type="hidden" name="apartmentId" value={apartment.id} />
                          <input
                            type="hidden"
                            name="isExempt"
                            value={apartment.is_dues_exempt ? "false" : "true"}
                          />
                          <p className="text-sm font-medium text-slate-800">
                            {apartmentDisplayMap.get(apartment.id)?.displayText ??
                              `${apartment.number}. Daire ${apartment.label}`}
                          </p>
                          <SubmitButton
                            pendingText="Kaydediliyor..."
                            className={`h-8 w-full rounded-md border px-3 text-xs font-semibold sm:w-auto ${
                              apartment.is_dues_exempt
                                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {apartment.is_dues_exempt ? "Muafiyeti Kaldir" : "Aidattan Muaf Et"}
                          </SubmitButton>
                        </form>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Ekstra Daire Basi Gider
                    </h2>
                    <form action={createSpecialAssessmentAction} className="mt-4 grid gap-3">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Baslik</span>
                        <input
                          required
                          type="text"
                          name="title"
                          placeholder="Bahce duzenlemesi"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Daire Basi Tutar</span>
                        <input
                          required
                          type="number"
                          min={1}
                          step="0.01"
                          name="perApartmentAmount"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Vade</span>
                        <input
                          required
                          type="date"
                          name="dueDate"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Donem (Opsiyonel)</span>
                        <select
                          name="periodId"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Doneme baglama</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {period.period_month}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Aciklama</span>
                        <input
                          type="text"
                          name="description"
                          placeholder="Tek seferlik duzenleme gideri"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <SubmitButton
                        pendingText="Ek gider dagitiliyor..."
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Ek Gideri Dagit
                      </SubmitButton>
                    </form>
                  </article>
                </div>
              ),
            },
            {
              id: "odeme",
              label: "Odeme Islemleri",
              content: (
                <div className="space-y-5">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">Odeme Ekle</h2>
                    <form action={addPaymentAction} className="mt-4 grid gap-3 lg:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Daire</span>
                        <select
                          required
                          name="apartmentId"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Seciniz</option>
                          {apartments.map((apartment) => (
                            <option key={apartment.id} value={apartment.id}>
                              {apartmentDisplayMap.get(apartment.id)?.displayText ??
                                `${apartment.number}. Daire ${apartment.label}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Tutar</span>
                        <input
                          required
                          type="number"
                          min={1}
                          step="0.01"
                          name="amount"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Odeme Tarihi</span>
                        <input
                          required
                          type="date"
                          name="paidAt"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Aciklama</span>
                        <input
                          type="text"
                          name="note"
                          placeholder="Yillik odeme, 3 aylik odeme vb."
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <SubmitButton
                        pendingText="Odeme kaydediliyor..."
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 lg:col-span-2"
                      >
                        Odemeyi Kaydet
                      </SubmitButton>
                    </form>
                  </article>

                  <PeriodFilteredRecordList
                    title="Kayitli Odemeler (Duzenle / Sil)"
                    emptyText="Bu donemde odeme kaydi yok."
                    periods={periodOptions}
                    items={payments.map((payment) => ({
                      id: payment.id,
                      periodId: matchPaymentToPeriod(payment.paid_at),
                      summary: `${apartmentDisplayMap.get(payment.apartment_id)?.displayText ?? `Daire ${payment.apartments?.number ?? "-"}`} — ${formatMoney(Number(payment.amount))} — ${formatDate(payment.paid_at)}`,
                      detail: (
                        <div className="space-y-2">
                          <form action={updatePaymentAction} className="grid gap-2 sm:grid-cols-2">
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <select
                              required
                              name="apartmentId"
                              defaultValue={payment.apartment_id}
                              className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                            >
                              {apartments.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {apartmentDisplayMap.get(a.id)?.displayText ?? `${a.number}. Daire ${a.label}`}
                                </option>
                              ))}
                            </select>
                            <input required type="number" min={1} step="0.01" name="amount" defaultValue={Number(payment.amount)} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <input required type="date" name="paidAt" defaultValue={payment.paid_at} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <input type="text" name="note" defaultValue={payment.note ?? ""} placeholder="Aciklama" className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <SubmitButton pendingText="Guncelleniyor..." className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:col-span-2">
                              Guncelle
                            </SubmitButton>
                          </form>
                          <form action={deletePaymentAction}>
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <SubmitButton pendingText="Siliniyor..." className="h-8 w-full rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto">
                              Odemeyi Sil
                            </SubmitButton>
                          </form>
                        </div>
                      ),
                    }))}
                  />
                </div>
              ),
            },
            {
              id: "gider",
              label: "Gider Islemleri",
              content: (
                <div className="space-y-5">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">Gider Ekle</h2>
                    <form action={addExpenseAction} className="mt-4 grid gap-3 lg:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Donem (Opsiyonel)</span>
                        <select
                          name="periodId"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Donem secmeden ekle</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {period.period_month} - Aidat {period.monthly_due}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Kategori</span>
                        <select
                          required
                          name="categoryId"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Seciniz</option>
                          {activeCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Baslik</span>
                        <input
                          required
                          type="text"
                          name="title"
                          placeholder="Apartman giris temizligi"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Tutar</span>
                        <input
                          required
                          type="number"
                          min={1}
                          step="0.01"
                          name="amount"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Gider Tarihi</span>
                        <input
                          required
                          type="date"
                          name="spentAt"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Aciklama</span>
                        <input
                          type="text"
                          name="note"
                          placeholder="Fatura no, notlar vb."
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <SubmitButton
                        pendingText="Gider kaydediliyor..."
                        className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 lg:col-span-2"
                      >
                        Gideri Kaydet
                      </SubmitButton>
                    </form>
                  </article>

                  <PeriodFilteredRecordList
                    title="Kayitli Giderler (Duzenle / Sil)"
                    emptyText="Bu donemde gider kaydi yok."
                    periods={periodOptions}
                    items={expenses.map((expense) => ({
                      id: expense.id,
                      periodId: expense.period_id,
                      summary: `${expense.category} — ${expense.title} — ${formatMoney(Number(expense.amount))}`,
                      detail: (
                        <div className="space-y-2">
                          <form action={updateExpenseAction} className="grid gap-2 sm:grid-cols-2">
                            <input type="hidden" name="expenseId" value={expense.id} />
                            <select required name="categoryId" defaultValue={expense.category_id ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
                              <option value="">Kategori</option>
                              {activeCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <input required type="text" name="title" defaultValue={expense.title} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <input required type="number" min={1} step="0.01" name="amount" defaultValue={Number(expense.amount)} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <input required type="date" name="spentAt" defaultValue={expense.spent_at} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <select name="periodId" defaultValue={expense.period_id ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
                              <option value="">Donem secmeden</option>
                              {periods.map((p) => (
                                <option key={p.id} value={p.id}>{p.period_month}</option>
                              ))}
                            </select>
                            <input type="text" name="note" defaultValue={expense.note ?? ""} placeholder="Aciklama" className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
                            <SubmitButton pendingText="Guncelleniyor..." className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:col-span-2">
                              Guncelle
                            </SubmitButton>
                          </form>
                          <form action={deleteExpenseAction}>
                            <input type="hidden" name="expenseId" value={expense.id} />
                            <SubmitButton pendingText="Siliniyor..." className="h-8 w-full rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto">
                              Gideri Sil
                            </SubmitButton>
                          </form>
                        </div>
                      ),
                    }))}
                  />
                </div>
              ),
            },
            {
              id: "kategori",
              label: "Kategoriler",
              content: (
                <div className="space-y-5">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">Yeni Kategori Ekle</h2>
                    <form action={addExpenseCategoryAction} className="mt-4 flex gap-2">
                      <input
                        required
                        type="text"
                        name="name"
                        placeholder="Dogalgaz, Kamera, Ortak Alan..."
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                      />
                      <SubmitButton
                        pendingText="..."
                        className="h-10 shrink-0 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Ekle
                      </SubmitButton>
                    </form>
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold text-slate-900">Mevcut Kategoriler</h2>
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {categories.length}
                      </span>
                    </div>
                    {categories.length === 0 ? (
                      <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
                        Henuz kategori eklenmedi.
                      </p>
                    ) : (
                      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                          >
                            <span
                              className={`mr-auto text-sm font-medium ${cat.active ? "text-slate-800" : "text-slate-400 line-through"}`}
                            >
                              {cat.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cat.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                            >
                              {cat.active ? "Aktif" : "Pasif"}
                            </span>
                            <form action={updateExpenseCategoryAction} className="flex gap-1">
                              <input type="hidden" name="categoryId" value={cat.id} />
                              <input
                                required
                                type="text"
                                name="name"
                                defaultValue={cat.name}
                                className="h-8 w-28 rounded-md border border-slate-300 px-2 text-xs sm:w-36"
                              />
                              <SubmitButton
                                pendingText="..."
                                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Kaydet
                              </SubmitButton>
                            </form>
                            <form action={deleteExpenseCategoryAction}>
                              <input type="hidden" name="categoryId" value={cat.id} />
                              <SubmitButton
                                pendingText="..."
                                className="h-8 rounded-md border border-rose-300 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Sil
                              </SubmitButton>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
