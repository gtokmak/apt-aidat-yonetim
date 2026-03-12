import { redirect } from "next/navigation";

export default async function RegisterPage() {
  redirect("/giris?error=Genel%20kayit%20kapali.%20Yonetici%20daveti%20gerekli.");
}
