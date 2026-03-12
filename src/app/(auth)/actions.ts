"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function toErrorUrl(path: string, message: string) {
  const encoded = encodeURIComponent(message);
  return `${path}?error=${encoded}`;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rememberMe = String(formData.get("rememberMe") ?? "") === "on";

  if (!email || !password) {
    redirect(toErrorUrl("/giris", "E-posta ve sifre zorunludur."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = error.message.toLowerCase().includes("email not confirmed")
      ? "E-posta dogrulanmamis. Gelen kutunuzdaki dogrulama baglantisina tiklayin."
      : error.message.toLowerCase().includes("invalid login credentials")
        ? "E-posta veya sifre hatali."
        : error.message;

    redirect(toErrorUrl("/giris", message));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle<{ is_active: boolean }>();

    if (!profileError && profile && !profile.is_active) {
      await supabase.auth.signOut();
      redirect(
        "/giris?error=Hesabiniz%20yonetici%20tarafindan%20pasife%20alinmis.",
      );
    }
  }

  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.set("apt_remember_email", email, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete("apt_remember_email");
  }

  redirect("/panel");
}

export async function signUpAction(formData: FormData) {
  void formData;
  redirect(
    "/giris?error=Genel%20kayit%20kapali.%20Lutfen%20yonetici%20davetini%20kullanin.",
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
