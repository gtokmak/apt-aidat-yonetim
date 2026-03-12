import { hasManagementRole, requireAuth } from "@/lib/auth";
import { enrichApartmentsWithResidents } from "@/lib/apartments";
import { formatMoney } from "@/lib/utils";

type Apartment = {
  id: string;
  number: number;
  label: string;
  is_dues_exempt: boolean;
};

type BalanceRow = {
  apartment_id: string;
  total_charges: number;
  total_payments: number;
  balance: number;
};

type MembershipRow = {
  apartment_id: string;
  user_id: string;
  ended_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

export default async function ApartmentsPage() {
  const { supabase, profile, memberships } = await requireAuth();
  const canManage = hasManagementRole(profile.role);
  const apartmentIds = memberships.map((item) => item.apartment_id);
  const residentHasApartment = apartmentIds.length > 0;

  const apartmentsPromise = canManage
    ? supabase
        .from("apartments")
        .select("id, number, label, is_dues_exempt")
        .order("number", { ascending: true })
        .returns<Apartment[]>()
    : residentHasApartment
      ? supabase
          .from("apartments")
          .select("id, number, label, is_dues_exempt")
          .in("id", apartmentIds)
          .order("number", { ascending: true })
          .returns<Apartment[]>()
      : Promise.resolve({ data: [] as Apartment[] });

  const balancesPromise = canManage
    ? supabase
        .from("apartment_balance_summary")
        .select("apartment_id, total_charges, total_payments, balance")
        .returns<BalanceRow[]>()
    : residentHasApartment
      ? supabase
          .from("apartment_balance_summary")
          .select("apartment_id, total_charges, total_payments, balance")
          .in("apartment_id", apartmentIds)
          .returns<BalanceRow[]>()
      : Promise.resolve({ data: [] as BalanceRow[] });

  const membersPromise = canManage
    ? supabase
        .from("apartment_memberships")
        .select("apartment_id, user_id, ended_at")
        .returns<MembershipRow[]>()
    : Promise.resolve({ data: [] as MembershipRow[] });

  const [apartmentsResult, balancesResult, membersResult] = await Promise.all([
    apartmentsPromise,
    balancesPromise,
    membersPromise,
  ]);

  const apartments = apartmentsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const apartmentDisplayMap = await enrichApartmentsWithResidents(supabase, apartments);

  const members = membersResult.data ?? [];
  const activeMembers = members.filter((member) => !member.ended_at);
  const userIds = [...new Set(activeMembers.map((member) => member.user_id))];
  const profilesResult =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };
  const profiles = profilesResult.data ?? [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const balanceMap = new Map(balances.map((item) => [item.apartment_id, item]));
  const memberMap = new Map<string, MembershipRow[]>();

  for (const member of activeMembers) {
    const existing = memberMap.get(member.apartment_id) ?? [];
    existing.push(member);
    memberMap.set(member.apartment_id, existing);
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        Daireler
      </p>
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Daire Bazli Bakiye Takibi
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apartments.length === 0 ? (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Goruntulenecek daire bulunamadi.
          </article>
        ) : (
          apartments.map((apartment) => {
            const balance = balanceMap.get(apartment.id);
            const aptMembers = memberMap.get(apartment.id) ?? [];
            const aptBalance = Number(balance?.balance ?? 0);
            const display = apartmentDisplayMap.get(apartment.id);

            return (
              <article
                key={apartment.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Daire {apartment.number}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {display?.displayText ?? `${apartment.number}. Daire ${apartment.label}`}
                </h2>
                {apartment.is_dues_exempt ? (
                  <p className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                    Aidattan Muaf
                  </p>
                ) : null}

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-600">Toplam Borc</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatMoney(Number(balance?.total_charges ?? 0))}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-600">Toplam Odeme</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatMoney(Number(balance?.total_payments ?? 0))}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                    <dt className="text-slate-700">Bakiye</dt>
                    <dd
                      className={`font-bold ${
                        aptBalance > 0
                          ? "text-rose-700"
                          : aptBalance < 0
                            ? "text-emerald-700"
                            : "text-slate-900"
                      }`}
                    >
                      {formatMoney(aptBalance)}
                    </dd>
                  </div>
                </dl>

                {canManage ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Yetkili Kullanicilar</p>
                    {aptMembers.length === 0 ? (
                      <p className="mt-1">Atama yok.</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {aptMembers.map((member) => (
                          <li key={`${apartment.id}-${member.user_id}`}>
                            {profileMap.get(member.user_id)?.full_name} -{" "}
                            {profileMap.get(member.user_id)?.email}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
