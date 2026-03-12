"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function acceptInvitationAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "").trim();

  if (!invitationId) {
    redirect("/davet?error=Gecersiz%20davet%20kaydi.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris?error=Davet%20kabul%20icin%20giris%20yapiniz.");
  }

  // Verify the invitation belongs to this user's email
  const { data: invitation } = await supabase
    .from("apartment_invitations")
    .select("email")
    .eq("id", invitationId)
    .eq("status", "pending")
    .maybeSingle<{ email: string }>();

  if (!invitation) {
    redirect(`/davet?invitation_id=${invitationId}&error=${encodeURIComponent("Davet bulunamadi veya artik aktif degil.")}`);
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    redirect(`/davet?invitation_id=${invitationId}&error=${encodeURIComponent("Bu davet baska bir e-posta adresine gonderilmis.")}`);
  }

  const { error } = await supabase.rpc("accept_apartment_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    redirect(`/davet?invitation_id=${invitationId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/panel");
  revalidatePath("/panel/daireler");
  revalidatePath("/panel/kullanicilar");
  redirect("/panel?success=Davet%20kabul%20edildi.");
}

export async function setInvitationPasswordAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!invitationId) {
    redirect("/davet?error=Gecersiz%20davet%20kaydi.");
  }

  if (password.length < 6) {
    redirect(
      `/davet?invitation_id=${invitationId}&error=Sifre%20en%20az%206%20karakter%20olmali.`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris?error=Sifre%20belirlemek%20icin%20giris%20gerekli.");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/davet?invitation_id=${invitationId}&error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/davet?invitation_id=${invitationId}&success=Sifre%20olusturuldu.`);
}
