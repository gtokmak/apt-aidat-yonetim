import { requireManager, roleLabel } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { SubmitButton } from "@/components/submit-button";
import { SectionTabs } from "@/components/section-tabs";
import { formatDate } from "@/lib/utils";

import {
  cancelInvitationAction,
  closeMembershipAction,
  inviteResidentAction,
  setUserRoleAction,
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
  role: "admin" | "apt_manager" | "resident";
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
  const { supabase, user, profile: currentProfile } = await requireManager();
  const isAdmin = currentProfile.role === "admin";

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
  const manageableProfiles = profiles.filter((profile) => profile.role !== "admin");

  const activeMemberships = memberships.filter((membership) => !membership.ended_at);
  const historicalMemberships = memberships.filter((membership) => membership.ended_at);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Kullanicilar
      </p>
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
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

      <div className="mt-6">
        <SectionTabs
          label="Kullanici islemi secin"
          tabs={[
            {
              id: "davet",
              label: "Davet Gonder",
              content: (
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    E-posta ile Kullanici Davet Et
                  </h2>
                  <form action={inviteResidentAction} className="mt-4 grid gap-3 lg:grid-cols-2">
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

                    <label className="space-y-1 text-sm lg:col-span-2">
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
                      className="h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 lg:col-span-2"
                    >
                      Davet Maili Gonder
                    </SubmitButton>
                  </form>
                </article>
              ),
            },
            {
              id: "aktif",
              label: "Aktif Kayitlar",
              content: (
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    Aktif Oturum Kayitlari
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeMemberships.length} aktif kayit bulundu
                  </p>
                  <div className="mt-4 space-y-3">
                    {activeMemberships.length === 0 ? (
                      <p className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
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
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {apartmentDisplayMap.get(membership.apartment_id)?.displayText ??
                                    `Daire ${membership.apartments?.number ?? "-"}`}
                                </p>
                                <p className="mt-1 break-words text-sm text-slate-700">
                                  {profile?.full_name || "Isimsiz"} - {profile?.email || "-"}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                {occupantTypeLabel(membership.occupant_type)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">
                              Giris: {formatDate(membership.started_at)}
                            </p>

                            <form action={closeMembershipAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <input type="hidden" name="membershipId" value={membership.id} />
                              <input
                                required
                                type="date"
                                name="endedAt"
                                className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm sm:w-auto"
                              />
                              <SubmitButton
                                pendingText="Isleniyor..."
                                className="h-9 w-full rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto"
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
              ),
            },
            {
              id: "yonetim",
              label: "Kullanici Yonetimi",
              content: (
                <div className="space-y-5">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Kullanici Durum Yonetimi (Aktif / Pasif)
                    </h2>
                    <div className="mt-4 space-y-3">
                      {manageableProfiles.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                          Yonetilecek kullanici bulunamadi.
                        </p>
                      ) : (
                        manageableProfiles.map((profile) => (
                          <div
                            key={profile.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-slate-900">
                                  {profile.full_name || "Isimsiz"}
                                </p>
                                <p className="break-all text-xs text-slate-600">{profile.email}</p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  profile.is_active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {profile.is_active ? "Aktif" : "Pasif"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Rol: {roleLabel(profile.role)} | Tel: {profile.phone || "-"}
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
                                disabled={!isAdmin || profile.id === user.id}
                                className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {profile.is_active ? "Pasife Al" : "Aktif Et"}
                              </SubmitButton>
                            </form>
                          </div>
                        ))
                      )}
                    </div>
                    {!isAdmin ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Kullanici aktif/pasif islemi yalnizca admin yonetici tarafindan yapilir.
                      </p>
                    ) : null}
                  </article>

                  {isAdmin ? (
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h2 className="text-base font-semibold text-slate-900">
                        Kullanici Rol Yonetimi
                      </h2>
                      <div className="mt-4 space-y-3">
                        {manageableProfiles.length === 0 ? (
                          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                            Rol guncellenecek kullanici bulunamadi.
                          </p>
                        ) : (
                          manageableProfiles.map((profile) => (
                            <form
                              key={`role-${profile.id}`}
                              action={setUserRoleAction}
                              className="rounded-lg border border-slate-200 bg-white p-3"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {profile.full_name || "Isimsiz"} - {profile.email}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Mevcut Rol: {roleLabel(profile.role)}
                              </p>
                              <input type="hidden" name="profileId" value={profile.id} />
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <select
                                  name="role"
                                  defaultValue={profile.role}
                                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                                >
                                  <option value="resident">Kullanici</option>
                                  <option value="apt_manager">Apartman Yonetici</option>
                                </select>
                                <SubmitButton
                                  pendingText="Rol guncelleniyor..."
                                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Rolu Guncelle
                                </SubmitButton>
                              </div>
                            </form>
                          ))
                        )}
                      </div>
                    </article>
                  ) : null}
                </div>
              ),
            },
            {
              id: "gecmis",
              label: "Kayit Gecmisi",
              content: (
                <div className="grid gap-5 lg:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">Davet Kayitlari</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {invitations.length} kayit
                    </p>
                    <div className="mt-4 space-y-3">
                      {invitations.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
                          Davet kaydi yok.
                        </p>
                      ) : (
                        invitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {apartmentDisplayMap.get(invitation.apartment_id)?.displayText ??
                                  `Daire ${invitation.apartments?.number ?? "-"}`}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  invitation.status === "accepted"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : invitation.status === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {invitation.status}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-sm text-slate-700">{invitation.email}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              {occupantTypeLabel(invitation.occupant_type)} | Baslangic:{" "}
                              {formatDate(invitation.starts_on)}
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
                    <p className="mt-1 text-xs text-slate-500">
                      {historicalMemberships.length} gecmis kayit
                    </p>
                    <div className="mt-4 space-y-3">
                      {historicalMemberships.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
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
                              <p className="mt-1 break-words text-sm text-slate-700">
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
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
