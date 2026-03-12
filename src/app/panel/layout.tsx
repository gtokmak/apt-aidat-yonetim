import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireAuth } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/panel", label: "Genel Durum" },
  { href: "/panel/defter", label: "Aylik Defter" },
  { href: "/panel/daireler", label: "Daireler" },
  { href: "/panel/kullanicilar", label: "Kullanicilar" },
  { href: "/panel/yonetim", label: "Yonetim" },
  { href: "/panel/profil", label: "Profilim" },
];

const residentLinks = [
  { href: "/panel", label: "Genel Durum" },
  { href: "/panel/defter", label: "Defter Ozeti" },
  { href: "/panel/daireler", label: "Daire Bilgisi" },
  { href: "/panel/profil", label: "Profilim" },
];

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, profile, memberships } = await requireAuth();
  const links = profile.role === "admin" ? adminLinks : residentLinks;
  const membershipApartments = memberships
    .map((membership) => ({
      id: membership.apartment_id,
      number: membership.apartments?.number ?? 0,
      label: membership.apartments?.label ?? "",
    }))
    .filter((apartment) => apartment.number > 0);
  const apartmentDisplayMap = await enrichApartmentsWithResidents(
    supabase,
    membershipApartments,
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef9c3_0%,#f8fafc_55%,#e2e8f0_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 p-4 md:grid-cols-[260px_1fr] md:p-6">
        <aside className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Apartman Paneli
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            {profile.full_name || "Kullanici"}
          </h2>
          <p className="text-sm text-slate-600">{profile.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
            Rol: {profile.role}
          </p>

          <nav className="mt-6 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Bagli Daireler</p>
            {memberships.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {memberships.map((membership) => (
                  <li key={membership.apartment_id}>
                    {apartmentDisplayMap.get(membership.apartment_id)?.displayText ??
                      `Daire ${membership.apartments?.number ?? "-"}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">
                Henuz daire atamasi yok. Yonetici atamasi bekleniyor.
              </p>
            )}
          </div>

          <form action={signOutAction} className="mt-6">
            <SubmitButton
              pendingText="Cikis yapiliyor..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
            >
              Cikis Yap
            </SubmitButton>
          </form>
        </aside>
        <main className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
