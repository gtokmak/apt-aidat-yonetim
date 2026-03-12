import type { SupabaseClient } from "@supabase/supabase-js";

type Apartment = {
  id: string;
  number: number;
  label: string;
};

type DisplayNameRow = {
  apartment_id: string;
  occupant_type: "owner" | "tenant";
  full_name: string;
  started_at: string;
};

export type ApartmentWithResident = Apartment & {
  residentNames: string[];
  primaryResidentName: string | null;
  displayText: string;
};

function uniq(values: string[]) {
  return [...new Set(values)];
}

export async function enrichApartmentsWithResidents(
  supabase: SupabaseClient,
  apartments: Apartment[],
) {
  if (apartments.length === 0) {
    return new Map<string, ApartmentWithResident>();
  }

  const apartmentIds = apartments.map((apartment) => apartment.id);

  const { data: displayRows } = await supabase
    .rpc("get_apartment_display_names")
    .returns<DisplayNameRow[]>();

  const rows = Array.isArray(displayRows) ? displayRows : [];
  const scopedRows = rows.filter((row) =>
    apartmentIds.includes(row.apartment_id),
  );
  const memberNamesByApartment = new Map<string, string[]>();

  for (const row of scopedRows) {
    const fullName = row.full_name?.trim();
    if (!fullName) {
      continue;
    }
    const existing = memberNamesByApartment.get(row.apartment_id) ?? [];
    existing.push(fullName);
    memberNamesByApartment.set(row.apartment_id, existing);
  }

  const result = new Map<string, ApartmentWithResident>();
  for (const apartment of apartments) {
    const residentNames = uniq(memberNamesByApartment.get(apartment.id) ?? []);
    const primaryResidentName = residentNames[0] ?? null;
    const displayText = primaryResidentName
      ? `${apartment.number}. Daire ${primaryResidentName}`
      : `${apartment.number}. Daire ${apartment.label}`;

    result.set(apartment.id, {
      ...apartment,
      residentNames,
      primaryResidentName,
      displayText,
    });
  }

  return result;
}
