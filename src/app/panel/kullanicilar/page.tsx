import { requireAdmin } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/utils";

import {
  cancelInvitationAction,
  closeMembershipAction,
  inviteResidentAction,
  setUserActiveAction,
} from "./actions";

type Apartment = {
  id: string;
  number: number;
  label: string;
};

type InvitationStatus = "pending" | "accepted" | "cancelled" | "failed";
type OccupantType = "owner" | "tenant";

type InvitationRow = {
  id: string;
  apartment_id: string;
  email: string;
  occupant_type: OccupantType;
  starts_on: string;
  ends_on: string | null;
  status: InvitationStatus;
  invited_at: string;
  accepted_at: string | null;
  note: string | null;
  apartments: {
    number: number;
    label: string;
  } | null;
};

type MembershipRow = {
  id: string;
  apartment_id: string;
  user_id: string;
  occupant_type: OccupantType;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  apartments: {
    number: number;
    label: string;
  } | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "admin" | "resident";
  is_active: boolean;
};

function occupantTypeLabel(type: OccupantType) {
  return type === "owner" ? "Ev Sahibi" : "Kiraci";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireAdmin();

  const [apartmentsResult, invitationsResult, membershipsResult] = await Promise.all([
    supabase
      .from("apartments")
      .select("id, number, label")
      .order("number", { ascending: true })
      .returns<Apartment[]>(),
    supabase
      .from("apartment_invitations")
      .select(
        "id, apartment_id, email, occupant_type, starts_on, ends_on, status, invited_at, accepted_at, note, apartments(number, label)",
      )
      .order("invited_at", { ascending: false })
      .returns<InvitationRow[]>(),
    supabase
      .from("apartment_memberships")
      .select(
        "id, apartment_id, user_id, occupant_type, started_at, ended_at, notes, apartments(number, label)",
      )
      .order("started_at", { ascending: false })
      .returns<MembershipRow[]>(),
  ]);

  const apartments = apartmentsResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);
  const invitations = invitationsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];

  const profilesResult = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active")
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  const profiles = profilesResult.data ?? [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const residentProfiles = profiles.filter((profile) => profile.role === "resident");

  const activeMemberships = memberships.filter((membership) => !membership.ended_at);
  const historicalMemberships = memberships.filter((membership) => membership.ended_at);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Kullanicilar
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">
        Davet ve Kiraci Devir Yonetimi
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Yonetici daireye e-posta ile davet gonderir. Kiraci cikis yaptiginda kayit
        kapatilir, yeni kiraci icin yeni davet acilir.
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

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            1) E-posta ile Kullanici Davet Et
          </h2>
          <form action={inviteResidentAction} className="mt-4 grid gap-3">
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
              <span className="font-medium text-slate-700">E-posta</span>
              <input
                required
                type="email"
                name="email"
                placeholder="kiraci@eposta.com"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Kullanici Tipi</span>
              <select
                required
                name="occupantType"
                defaultValue="tenant"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="tenant">Kiraci</option>
                <option value="owner">Ev Sahibi</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Baslangic Tarihi</span>
              <input
                required
                type="date"
                name="startsOn"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Not</span>
              <input
                type="text"
                name="note"
                placeholder="Opsiyonel not"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <SubmitButton
              pendingText="Davet gonderiliyor..."
              className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Davet Maili Gonder
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            2) Aktif Oturum Kayitlari
          </h2>
          <div className="mt-4 space-y-3">
            {activeMemberships.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Aktif kayit yok.
              </p>
            ) : (
              activeMemberships.map((membership) => {
                const profile = profileMap.get(membership.user_id);
                return (
                  <div
                    key={membership.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {apartmentDisplayMap.get(membership.apartment_id)?.displayText ??
                        `Daire ${membership.apartments?.number ?? "-"}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {profile?.full_name || "Isimsiz"} - {profile?.email || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Tip: {occupantTypeLabel(membership.occupant_type)} | Giris:{" "}
                      {formatDate(membership.started_at)}
                    </p>

                    <form action={closeMembershipAction} className="mt-3 flex gap-2">
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <input
                        required
                        type="date"
                        name="endedAt"
                        className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                      />
                      <SubmitButton
                        pendingText="Isleniyor..."
                        className="h-9 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Cikis Yapti Olarak Isaretle
                      </SubmitButton>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">
          3) Kullanici Durum Yonetimi (Aktif / Pasif)
        </h2>
        <div className="mt-4 space-y-3">
          {residentProfiles.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Yonetilecek resident kullanici bulunamadi.
            </p>
          ) : (
            residentProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {profile.full_name || "Isimsiz"} - {profile.email}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Tel: {profile.phone || "-"} | Durum:{" "}
                  <span
                    className={
                      profile.is_active ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"
                    }
                  >
                    {profile.is_active ? "Aktif" : "Pasif"}
                  </span>
                </p>
                <form action={setUserActiveAction} className="mt-2">
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={profile.is_active ? "false" : "true"}
                  />
                  <SubmitButton
                    pendingText="Guncelleniyor..."
                    disabled={profile.id === user.id}
                    className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {profile.is_active ? "Pasife Al" : "Aktif Et"}
                  </SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">Davet Kayitlari</h2>
          <div className="mt-4 space-y-3">
            {invitations.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Davet kaydi yok.
              </p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {apartmentDisplayMap.get(invitation.apartment_id)?.displayText ??
                      `Daire ${invitation.apartments?.number ?? "-"}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{invitation.email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {occupantTypeLabel(invitation.occupant_type)} | Baslangic:{" "}
                    {formatDate(invitation.starts_on)} | Durum: {invitation.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Davet: {formatDate(invitation.invited_at)}
                    {invitation.accepted_at
                      ? ` | Kabul: ${formatDate(invitation.accepted_at)}`
                      : ""}
                  </p>
                  {invitation.note ? (
                    <p className="mt-1 text-xs text-slate-600">Not: {invitation.note}</p>
                  ) : null}

                  {invitation.status === "pending" ? (
                    <form action={cancelInvitationAction} className="mt-3">
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <SubmitButton
                        pendingText="Iptal ediliyor..."
                        className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Daveti Iptal Et
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            Kiraci / Oturum Gecmisi
          </h2>
          <div className="mt-4 space-y-3">
            {historicalMemberships.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Gecmis kayit yok.
              </p>
            ) : (
              historicalMemberships.map((membership) => {
                const profile = profileMap.get(membership.user_id);
                return (
                  <div
                    key={membership.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {apartmentDisplayMap.get(membership.apartment_id)?.displayText ??
                        `Daire ${membership.apartments?.number ?? "-"}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {profile?.full_name || "Isimsiz"} - {profile?.email || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {occupantTypeLabel(membership.occupant_type)} |{" "}
                      {formatDate(membership.started_at)} -{" "}
                      {membership.ended_at ? formatDate(membership.ended_at) : "-"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
