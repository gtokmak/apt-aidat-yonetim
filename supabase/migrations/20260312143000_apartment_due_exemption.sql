alter table public.apartments
add column if not exists is_dues_exempt boolean not null default false;

create index if not exists apartments_is_dues_exempt_idx
  on public.apartments (is_dues_exempt);

create or replace function public.create_period_with_dues(
  p_period_month date,
  p_monthly_due numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
  v_period_month date;
begin
  if not public.is_manager(auth.uid()) then
    raise exception 'only manager can create periods';
  end if;

  v_period_month := date_trunc('month', p_period_month)::date;

  insert into public.periods (period_month, monthly_due, notes, created_by)
  values (v_period_month, p_monthly_due, p_notes, auth.uid())
  returning id into v_period_id;

  insert into public.charges (apartment_id, period_id, charge_type, title, amount, due_date, created_by)
  select
    a.id,
    v_period_id,
    'monthly_due'::public.charge_type,
    to_char(v_period_month, 'TMMonth YYYY') || ' Aidat',
    p_monthly_due,
    (v_period_month + interval '1 month - 1 day')::date,
    auth.uid()
  from public.apartments a
  where not a.is_dues_exempt;

  return v_period_id;
end;
$$;

drop policy if exists apartments_write_policy on public.apartments;
create policy apartments_write_policy
on public.apartments
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());
