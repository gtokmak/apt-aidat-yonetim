import { requireAuth } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";

import { changePasswordAction, updateProfileAction } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requireAuth();

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Profil
      </p>
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Profil Ayarlari</h1>
      <p className="mt-2 text-sm text-slate-600">
        Isim, telefon ve sifre bilgilerinizi buradan guncelleyebilirsiniz.
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
          <h2 className="text-base font-semibold text-slate-900">1) Profil Bilgileri</h2>
          <form action={updateProfileAction} className="mt-4 grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Ad Soyad</span>
              <input
                required
                type="text"
                name="fullName"
                defaultValue={profile.full_name}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Telefon</span>
              <input
                type="tel"
                name="phone"
                defaultValue={profile.phone ?? ""}
                placeholder="05xx xxx xx xx"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">E-posta</span>
              <input
                readOnly
                type="email"
                value={profile.email}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-slate-600"
              />
            </label>
            <SubmitButton
              pendingText="Profil guncelleniyor..."
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Profili Guncelle
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">2) Sifre Degistir</h2>
          <form action={changePasswordAction} className="mt-4 grid gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Yeni Sifre</span>
              <input
                required
                minLength={6}
                type="password"
                name="newPassword"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Yeni Sifre Tekrar</span>
              <input
                required
                minLength={6}
                type="password"
                name="confirmPassword"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <SubmitButton
              pendingText="Sifre guncelleniyor..."
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Sifreyi Guncelle
            </SubmitButton>
          </form>
        </article>
      </div>
    </section>
  );
}
