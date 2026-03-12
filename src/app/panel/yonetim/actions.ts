"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
    .maybeSingle<{ role: "admin" | "resident" }>();

  if (!profile || profile.role !== "admin") {
    redirect("/panel");
  }

  return { supabase, userId: user.id };
}

function revalidatePanelPaths() {
  revalidatePath("/panel");
  revalidatePath("/panel/defter");
  revalidatePath("/panel/daireler");
  revalidatePath("/panel/yonetim");
  revalidatePath("/panel/kullanicilar");
}

function toNumberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

export async function createPeriodAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const periodMonthRaw = String(formData.get("periodMonth") ?? "").trim();
  const monthlyDueRaw = toNumberOrNull(formData.get("monthlyDue"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!periodMonthRaw || !monthlyDueRaw || monthlyDueRaw <= 0) {
    redirect("/panel/yonetim?error=Donem%20ve%20aidat%20zorunlu.");
  }

  const periodMonth = `${periodMonthRaw}-01`;
  const { error } = await supabase.rpc("create_period_with_dues", {
    p_period_month: periodMonth,
    p_monthly_due: monthlyDueRaw,
    p_notes: notes || null,
  });

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Donem%20olusturuldu.");
}

export async function createSpecialAssessmentAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const amount = toNumberOrNull(formData.get("perApartmentAmount"));
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !amount || amount <= 0 || !dueDate) {
    redirect("/panel/yonetim?error=Baslik%2C%20tutar%20ve%20vade%20zorunlu.");
  }

  const { error } = await supabase.rpc("create_special_assessment", {
    p_title: title,
    p_per_apartment_amount: amount,
    p_due_date: dueDate,
    p_period_id: periodId || null,
    p_description: description || null,
  });

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Ek%20gider%20olusturuldu.");
}

export async function addPaymentAction(formData: FormData) {
  const { supabase, userId } = await assertAdmin();

  const apartmentId = String(formData.get("apartmentId") ?? "").trim();
  const amount = toNumberOrNull(formData.get("amount"));
  const paidAt = String(formData.get("paidAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!apartmentId || !amount || amount <= 0 || !paidAt) {
    redirect("/panel/yonetim?error=Daire%2C%20tutar%20ve%20tarih%20zorunlu.");
  }

  const { error } = await supabase.from("payments").insert({
    apartment_id: apartmentId,
    amount,
    paid_at: paidAt,
    note: note || null,
    created_by: userId,
  });

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Odeme%20kaydedildi.");
}

export async function updatePaymentAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const apartmentId = String(formData.get("apartmentId") ?? "").trim();
  const amount = toNumberOrNull(formData.get("amount"));
  const paidAt = String(formData.get("paidAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!paymentId || !apartmentId || !amount || amount <= 0 || !paidAt) {
    redirect("/panel/yonetim?error=Odeme%20duzenleme%20bilgileri%20eksik.");
  }

  const { error } = await supabase
    .from("payments")
    .update({
      apartment_id: apartmentId,
      amount,
      paid_at: paidAt,
      note: note || null,
    })
    .eq("id", paymentId);

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Odeme%20guncellendi.");
}

export async function deletePaymentAction(formData: FormData) {
  const { supabase } = await assertAdmin();
  const paymentId = String(formData.get("paymentId") ?? "").trim();

  if (!paymentId) {
    redirect("/panel/yonetim?error=Gecersiz%20odeme%20kaydi.");
  }

  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Odeme%20silindi.");
}

export async function addExpenseAction(formData: FormData) {
  const { supabase, userId } = await assertAdmin();

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = toNumberOrNull(formData.get("amount"));
  const spentAt = String(formData.get("spentAt") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!categoryId || !title || !amount || amount <= 0 || !spentAt) {
    redirect(
      "/panel/yonetim?error=Kategori%2C%20baslik%2C%20tutar%20ve%20tarih%20zorunlu.",
    );
  }

  const { data: category } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("id", categoryId)
    .maybeSingle<{ id: string; name: string }>();

  if (!category) {
    redirect("/panel/yonetim?error=Kategori%20bulunamadi.");
  }

  const { error } = await supabase.from("expenses").insert({
    period_id: periodId || null,
    category: category.name,
    category_id: category.id,
    title,
    amount,
    spent_at: spentAt,
    note: note || null,
    created_by: userId,
  });

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Gider%20kaydedildi.");
}

export async function updateExpenseAction(formData: FormData) {
  const { supabase } = await assertAdmin();

  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = toNumberOrNull(formData.get("amount"));
  const spentAt = String(formData.get("spentAt") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!expenseId || !categoryId || !title || !amount || amount <= 0 || !spentAt) {
    redirect("/panel/yonetim?error=Gider%20duzenleme%20bilgileri%20eksik.");
  }

  const { data: category } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("id", categoryId)
    .maybeSingle<{ id: string; name: string }>();

  if (!category) {
    redirect("/panel/yonetim?error=Kategori%20bulunamadi.");
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      period_id: periodId || null,
      category: category.name,
      category_id: category.id,
      title,
      amount,
      spent_at: spentAt,
      note: note || null,
    })
    .eq("id", expenseId);

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Gider%20guncellendi.");
}

export async function deleteExpenseAction(formData: FormData) {
  const { supabase } = await assertAdmin();
  const expenseId = String(formData.get("expenseId") ?? "").trim();

  if (!expenseId) {
    redirect("/panel/yonetim?error=Gecersiz%20gider%20kaydi.");
  }

  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Gider%20silindi.");
}

export async function addExpenseCategoryAction(formData: FormData) {
  const { supabase, userId } = await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/panel/yonetim?error=Kategori%20adi%20zorunlu.");
  }

  const { error } = await supabase.from("expense_categories").upsert(
    {
      name,
      active: true,
      created_by: userId,
    },
    { onConflict: "name" },
  );

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Kategori%20eklendi.");
}

export async function updateExpenseCategoryAction(formData: FormData) {
  const { supabase } = await assertAdmin();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!categoryId || !name) {
    redirect("/panel/yonetim?error=Kategori%20duzenleme%20bilgileri%20eksik.");
  }

  const { error } = await supabase
    .from("expense_categories")
    .update({ name, active: true })
    .eq("id", categoryId);

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Kategori%20guncellendi.");
}

export async function deleteExpenseCategoryAction(formData: FormData) {
  const { supabase } = await assertAdmin();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    redirect("/panel/yonetim?error=Gecersiz%20kategori%20kaydi.");
  }

  const { count } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if ((count ?? 0) > 0) {
    const { error: deactivateError } = await supabase
      .from("expense_categories")
      .update({ active: false })
      .eq("id", categoryId);

    if (deactivateError) {
      redirect(`/panel/yonetim?error=${encodeURIComponent(deactivateError.message)}`);
    }

    revalidatePanelPaths();
    redirect("/panel/yonetim?success=Kategori%20kullanimda%20oldugu%20icin%20pasife%20alindi.");
  }

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    redirect(`/panel/yonetim?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePanelPaths();
  redirect("/panel/yonetim?success=Kategori%20silindi.");
}
