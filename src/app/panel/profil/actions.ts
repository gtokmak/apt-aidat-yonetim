"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  return { supabase, userId: user.id };
}

export async function updateProfileAction(formData: FormData) {
  const { supabase, userId } = await getAuthenticatedUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    redirect("/panel/profil?error=Ad%20soyad%20zorunludur.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
    })
    .eq("id", userId);

  if (error) {
    redirect(`/panel/profil?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/panel");
  revalidatePath("/panel/profil");
  redirect("/panel/profil?success=Profil%20bilgileri%20guncellendi.");
}

export async function changePasswordAction(formData: FormData) {
  const { supabase } = await getAuthenticatedUser();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    redirect("/panel/profil?error=Sifre%20en%20az%206%20karakter%20olmali.");
  }

  if (newPassword !== confirmPassword) {
    redirect("/panel/profil?error=Sifre%20tekrari%20uyusmuyor.");
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    redirect(`/panel/profil?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/panel/profil?success=Sifre%20guncellendi.");
}
