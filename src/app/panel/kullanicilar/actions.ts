"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Role = "admin" | "resident";
type OccupantType = "owner" | "tenant";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  if (!profile || profile.role !== "admin") {
    redirect("/panel");
  }

  return { supabase, userId: user.id };
}

function revalidatePages() {
  revalidatePath("/panel");
  revalidatePath("/panel/daireler");
  revalidatePath("/panel/kullanicilar");
  revalidatePath("/panel/profil");
}

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

export async function inviteResidentAction(formData: FormData) {
  const { supabase, userId } = await assertAdmin();

  const apartmentId = String(formData.get("apartmentId") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const occupantType = String(formData.get("occupantType") ?? "tenant").trim() as OccupantType;
  const startsOn = String(formData.get("startsOn") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!apartmentId || !email || !startsOn) {
    redirect(
      "/panel/kullanicilar?error=Daire%2C%20e-posta%20ve%20baslangic%20tarihi%20zorunlu.",
    );
  }

  if (occupantType !== "owner" && occupantType !== "tenant") {
    redirect("/panel/kullanicilar?error=Gecersiz%20kullanici%20tipi.");
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("apartment_invitations")
    .insert({
      apartment_id: apartmentId,
      email,
      occupant_type: occupantType,
      starts_on: startsOn,
      invited_by: userId,
      note: note || null,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (invitationError || !invitation) {
    redirect(`/panel/kullanicilar?error=${encodeURIComponent(invitationError?.message ?? "Davet kaydi olusturulamadi.")}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = getAppUrl();

  if (!supabaseUrl || !serviceRoleKey) {
    await supabase
      .from("apartment_invitations")
      .update({
        status: "failed",
        note: `${note ? `${note} - ` : ""}SERVICE_ROLE eksik.`,
      })
      .eq("id", invitation.id);

    redirect(
      "/panel/kullanicilar?error=SUPABASE_SERVICE_ROLE_KEY%20eksik.%20Davet%20maili%20gonderilemedi.",
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const nextPath = `/davet?invitation_id=${invitation.id}`;
  const redirectTo = `${appUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}`;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invitation_id: invitation.id,
      },
    });

  if (inviteError) {
    await supabase
      .from("apartment_invitations")
      .update({
        status: "failed",
        note: `${note ? `${note} - ` : ""}${inviteError.message}`,
      })
      .eq("id", invitation.id);

    redirect(
      `/panel/kullanicilar?error=${encodeURIComponent(`Davet maili gonderilemedi: ${inviteError.message}`)}`,
    );
  }

  if (inviteData.user?.id) {
    await supabase
      .from("apartment_invitations")
      .update({ invited_user_id: inviteData.user.id })
      .eq("id", invitation.id);
  }

  revalidatePages();
  redirect("/panel/kullanicilar?success=Davet%20maili%20gonderildi.");
}

export async function closeMembershipAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const endedAt = String(formData.get("endedAt") ?? "").trim();

  if (!membershipId || !endedAt) {
    redirect("/panel/kullanicilar?error=Kayit%20ve%20cikis%20tarihi%20zorunlu.");
  }

  const { error } = await supabase
    .from("apartment_memberships")
    .update({ ended_at: endedAt })
    .eq("id", membershipId);

  if (error) {
    redirect(`/panel/kullanicilar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePages();
  redirect("/panel/kullanicilar?success=Kullanici%20kaydi%20kapatildi.");
}

export async function cancelInvitationAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) {
    redirect("/panel/kullanicilar?error=Gecersiz%20davet%20kaydi.");
  }

  const { error } = await supabase
    .from("apartment_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (error) {
    redirect(`/panel/kullanicilar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePages();
  redirect("/panel/kullanicilar?success=Davet%20iptal%20edildi.");
}

export async function setUserActiveAction(formData: FormData) {
  const { supabase, userId: adminUserId } = await assertAdmin();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const activeRaw = String(formData.get("active") ?? "").trim();

  if (!profileId || (activeRaw !== "true" && activeRaw !== "false")) {
    redirect("/panel/kullanicilar?error=Gecersiz%20kullanici%20durumu.");
  }

  if (profileId === adminUserId) {
    redirect("/panel/kullanicilar?error=Kendi%20hesabinizi%20pasife%20alamazsiniz.");
  }

  const active = activeRaw === "true";
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", profileId);

  if (error) {
    redirect(`/panel/kullanicilar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePages();
  redirect("/panel/kullanicilar?success=Kullanici%20durumu%20guncellendi.");
}
