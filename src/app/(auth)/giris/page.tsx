import { signInAction } from "@/app/(auth)/actions";
import { cookies } from "next/headers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;
  const cookieStore = await cookies();
  const rememberedEmail = cookieStore.get("apt_remember_email")?.value ?? "";

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-200 bg-white/80 shadow-[0_32px_80px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="bg-slate-950 p-8 text-slate-100 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
            Apartman Defteri
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            Gelir gider takibini tek ekranda yonetin.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Bu panelde yonetici ve daire kullanicilari kendi yetkilerine gore
            bilgi gorur. Yillik odeme, toplu odeme, ek gider ve aylik aidat
            hareketlerini ayni yapida izleyebilirsiniz.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm">
            <p className="font-medium text-amber-200">Kayit sadece davet ile aciktir.</p>
            <p className="mt-2 text-slate-300">
              Yonetici e-posta daveti gonderir. Davet linki ile giris yapan
              kullanici ilgili daireye otomatik baglanir.
            </p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-xl font-semibold text-slate-900">Giris Yap</h2>
          <p className="mt-2 text-sm text-slate-600">
            Hesabiniza giris yaparak kendi panelinizi acin.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <form action={signInAction} className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-700">E-posta</span>
              <input
                required
                type="email"
                name="email"
                placeholder="ornek@eposta.com"
                defaultValue={rememberedEmail}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-700">Sifre</span>
              <input
                required
                type="password"
                name="password"
                placeholder="******"
                className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="rememberMe"
                defaultChecked={Boolean(rememberedEmail)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Beni hatirla (e-posta)
            </label>
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Giris Yap
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Kullanicilar yonetici daveti ile sisteme dahil edilir.
          </p>
        </div>
      </div>
    </section>
  );
}
