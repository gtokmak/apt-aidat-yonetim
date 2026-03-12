import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

import { acceptInvitationAction, setInvitationPasswordAction } from "./actions";

type InvitationStatus = "pending" | "accepted" | "cancelled" | "failed";
type OccupantType = "owner" | "tenant";

type Invitation = {
  id: string;
  email: string;
  status: InvitationStatus;
  occupant_type: OccupantType;
  starts_on: string;
  apartments: {
    number: number;
    label: string;
  } | null;
};

function occupantTypeLabel(type: OccupantType) {
  return type === "owner" ? "Ev Sahibi" : "Kiraci";
}

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation_id?: string; error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const invitationId = params.invitation_id;
  const error = params.error;
  const success = params.success;

  if (!invitationId) {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Davet Bulunamadi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Link gecersiz veya eksik. Yoneticiye yeni davet gondermesi icin bilgi verin.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Giris Gerekiyor</h1>
        <p className="mt-2 text-sm text-slate-600">
          Daveti kabul etmek icin once giris yapin.
        </p>
        <Link
          href="/giris"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Giris Sayfasina Git
        </Link>
      </main>
    );
  }

  const { data: invitation } = await supabase
    .from("apartment_invitations")
    .select("id, email, status, occupant_type, starts_on, apartments(number, label)")
    .eq("id", invitationId)
    .maybeSingle<Invitation>();

  if (!invitation) {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Davet Erisimi Yok</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bu davet sizin hesabinizla eslesmiyor veya kullanilmis olabilir.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Daire Daveti
      </p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        Daire {invitation.apartments?.number} - {invitation.apartments?.label}
      </h1>

      <dl className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <dt>E-posta</dt>
          <dd className="font-medium text-slate-900">{invitation.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Tip</dt>
          <dd className="font-medium text-slate-900">
            {occupantTypeLabel(invitation.occupant_type)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Baslangic</dt>
          <dd className="font-medium text-slate-900">{formatDate(invitation.starts_on)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Durum</dt>
          <dd className="font-medium text-slate-900">{invitation.status}</dd>
        </div>
      </dl>

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

      <form action={setInvitationPasswordAction} className="mt-5 space-y-2">
        <input type="hidden" name="invitationId" value={invitation.id} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">
            Bu hesap icin sifre belirle (onerilen)
          </span>
          <input
            required
            minLength={6}
            type="password"
            name="password"
            placeholder="En az 6 karakter"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
        </label>
        <SubmitButton
          pendingText="Kaydediliyor..."
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Sifreyi Kaydet
        </SubmitButton>
      </form>

      {invitation.status === "pending" ? (
        <form action={acceptInvitationAction} className="mt-5">
          <input type="hidden" name="invitationId" value={invitation.id} />
          <SubmitButton
            pendingText="Davet kabul ediliyor..."
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Daveti Kabul Et
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Bu davet artik aktif degil.
        </p>
      )}
    </main>
  );
}
