import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: "admin" | "resident";
};

type ProfileDbRow = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "resident";
  phone?: string | null;
  is_active?: boolean | null;
};

type Membership = {
  apartment_id: string;
  apartments: {
    number: number;
    label: string;
  } | null;
};

function normalizeProfile(row: ProfileDbRow): Profile {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? null,
    is_active: row.is_active ?? true,
  };
}

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: extendedProfile, error: extendedError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_active, role")
    .eq("id", userId)
    .maybeSingle<ProfileDbRow>();

  if (!extendedError && extendedProfile) {
    return normalizeProfile(extendedProfile);
  }

  const { data: legacyProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle<ProfileDbRow>();

  if (legacyProfile) {
    return normalizeProfile(legacyProfile);
  }

  return null;
}

async function getOrCreateProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
) {
  const existingProfile = await fetchProfile(supabase, user.id);
  if (existingProfile) {
    return existingProfile;
  }

  const { count: adminCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const fallbackRole: Profile["role"] = (adminCount ?? 0) > 0 ? "resident" : "admin";

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? `${user.id}@local.invalid`,
      full_name: String(user.user_metadata?.full_name ?? ""),
      role: fallbackRole,
    })
    .select("id, full_name, email, role")
    .maybeSingle<ProfileDbRow>();

  if (!createError && createdProfile) {
    return normalizeProfile(createdProfile);
  }

  return fetchProfile(supabase, user.id);
}

export async function requireAuth() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/giris");
  }

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile) {
    redirect("/giris?error=Profil%20kaydi%20olusturulamadi.");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/giris?error=Hesabiniz%20yonetici%20tarafindan%20pasife%20alinmis.");
  }

  const { data: memberships } = await supabase
    .from("apartment_memberships")
    .select("apartment_id, apartments(number, label)")
    .eq("user_id", user.id)
    .lte("started_at", today)
    .or(`ended_at.is.null,ended_at.gte.${today}`)
    .returns<Membership[]>();

  return {
    supabase,
    user,
    profile,
    memberships: memberships ?? [],
  };
}

export async function requireAdmin() {
  const context = await requireAuth();

  if (context.profile.role !== "admin") {
    redirect("/panel");
  }

  return context;
}
