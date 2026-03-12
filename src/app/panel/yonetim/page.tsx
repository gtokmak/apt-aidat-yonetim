import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, formatMoney } from "@/lib/utils";

import {
  addExpenseAction,
  addExpenseCategoryAction,
  addPaymentAction,
  createPeriodAction,
  createSpecialAssessmentAction,
  deleteExpenseAction,
  deleteExpenseCategoryAction,
  deletePaymentAction,
  updateExpenseAction,
  updateExpenseCategoryAction,
  updatePaymentAction,
} from "./actions";

type Apartment = {
  id: string;
  number: number;
  label: string;
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

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();

  const [
    apartmentsResult,
    periodsResult,
    categoriesResult,
    paymentsResult,
    expensesResult,
  ] = await Promise.all([
    supabase
      .from("apartments")
      .select("id, number, label")
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
      .limit(25)
      .returns<PaymentRow[]>(),
    supabase
      .from("expenses")
      .select("id, period_id, category_id, category, title, amount, spent_at, note")
      .order("spent_at", { ascending: false })
      .limit(25)
      .returns<ExpenseRow[]>(),
  ]);

  const apartments = apartmentsResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);
  const periods = periodsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const activeCategories = categories.filter((category) => category.active);
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Yonetim
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Yonetici Islemleri</h1>
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

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            1) Aylik Aidat Donemi Ac
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

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">2) Odeme Ekle</h2>
          <form action={addPaymentAction} className="mt-4 grid gap-3">
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
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Odemeyi Kaydet
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">3) Gider Ekle</h2>
          <form action={addExpenseAction} className="mt-4 grid gap-3">
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
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Gideri Kaydet
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">4) Kategori Yonetimi</h2>
          <form action={addExpenseCategoryAction} className="mt-4 grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Yeni Kategori</span>
              <input
                required
                type="text"
                name="name"
                placeholder="Dogalgaz, Kamera, Ortak Alan..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <SubmitButton
              pendingText="Kategori ekleniyor..."
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Kategori Ekle
            </SubmitButton>
          </form>

          <form action={updateExpenseCategoryAction} className="mt-4 grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Duzenlenecek Kategori</span>
              <select
                required
                name="categoryId"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">Seciniz</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.active ? "(Aktif)" : "(Pasif)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Yeni Kategori Adi</span>
              <input
                required
                type="text"
                name="name"
                placeholder="Kategori adini yazin"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <SubmitButton
              pendingText="Kategori duzenleniyor..."
              className="h-10 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Secili Kategoriyi Duzenle
            </SubmitButton>
          </form>

          <form action={deleteExpenseCategoryAction} className="mt-3 grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Silinecek Kategori</span>
              <select
                required
                name="categoryId"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">Seciniz</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.active ? "(Aktif)" : "(Pasif)"}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton
              pendingText="Kategori siliniyor..."
              className="h-10 rounded-lg border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Secili Kategoriyi Sil / Pasife Al
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            5) Ekstra Daire Basi Gider
          </h2>
          <form action={createSpecialAssessmentAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
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
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 md:col-span-2"
            >
              Ek Gideri Dagit
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            6) Kayitli Odemeler (Duzenle / Sil)
          </h2>
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Odeme kaydi yok.
              </p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-xs text-slate-500">
                    Mevcut:{" "}
                    {apartmentDisplayMap.get(payment.apartment_id)?.displayText ??
                      `Daire ${payment.apartments?.number ?? "-"}`}{" "}
                    - {formatMoney(Number(payment.amount))} - {formatDate(payment.paid_at)}
                  </p>
                  <form action={updatePaymentAction} className="mt-2 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <select
                      required
                      name="apartmentId"
                      defaultValue={payment.apartment_id}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      {apartments.map((apartment) => (
                        <option key={apartment.id} value={apartment.id}>
                          {apartmentDisplayMap.get(apartment.id)?.displayText ??
                            `${apartment.number}. Daire ${apartment.label}`}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      min={1}
                      step="0.01"
                      name="amount"
                      defaultValue={Number(payment.amount)}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                    <input
                      required
                      type="date"
                      name="paidAt"
                      defaultValue={payment.paid_at}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                    <input
                      type="text"
                      name="note"
                      defaultValue={payment.note ?? ""}
                      placeholder="Aciklama"
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm md:col-span-2"
                    />
                    <SubmitButton
                      pendingText="Guncelleniyor..."
                      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Guncelle
                    </SubmitButton>
                  </form>
                  <form action={deletePaymentAction} className="mt-2">
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <SubmitButton
                      pendingText="Siliniyor..."
                      className="h-8 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Odemeyi Sil
                    </SubmitButton>
                  </form>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            7) Kayitli Giderler (Duzenle / Sil)
          </h2>
          <div className="mt-4 space-y-3">
            {expenses.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Gider kaydi yok.
              </p>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-xs text-slate-500">
                    Mevcut: {expense.category} - {expense.title} -{" "}
                    {formatMoney(Number(expense.amount))} - {formatDate(expense.spent_at)}
                  </p>
                  <form action={updateExpenseAction} className="mt-2 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <select
                      required
                      name="categoryId"
                      defaultValue={expense.category_id ?? ""}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      <option value="">Kategori</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="text"
                      name="title"
                      defaultValue={expense.title}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                    <input
                      required
                      type="number"
                      min={1}
                      step="0.01"
                      name="amount"
                      defaultValue={Number(expense.amount)}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                    <input
                      required
                      type="date"
                      name="spentAt"
                      defaultValue={expense.spent_at}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                    <select
                      name="periodId"
                      defaultValue={expense.period_id ?? ""}
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      <option value="">Donem secmeden</option>
                      {periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.period_month}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="note"
                      defaultValue={expense.note ?? ""}
                      placeholder="Aciklama"
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm md:col-span-2"
                    />
                    <SubmitButton
                      pendingText="Guncelleniyor..."
                      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Guncelle
                    </SubmitButton>
                  </form>
                  <form action={deleteExpenseAction} className="mt-2">
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <SubmitButton
                      pendingText="Siliniyor..."
                      className="h-8 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Gideri Sil
                    </SubmitButton>
                  </form>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
