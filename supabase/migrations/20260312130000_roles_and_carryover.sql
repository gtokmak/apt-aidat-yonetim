do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'apt_manager'
  ) then
    alter type public.app_role add value 'apt_manager';
  end if;
end
$$;

create or replace function public.is_manager(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role::text in ('admin', 'apt_manager')
  );
$$;

grant execute on function public.is_manager(uuid) to authenticated;

create table if not exists public.finance_settings (
  id smallint primary key default 1 check (id = 1),
  opening_carry_over numeric(12, 2) not null default 0,
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.finance_settings to authenticated;

insert into public.finance_settings (id, opening_carry_over)
values (1, 0)
on conflict (id) do nothing;

drop trigger if exists trg_finance_settings_updated_at on public.finance_settings;
create trigger trg_finance_settings_updated_at
before update on public.finance_settings
for each row execute function public.handle_updated_at();

alter table public.finance_settings enable row level security;

drop policy if exists finance_settings_select_policy on public.finance_settings;
create policy finance_settings_select_policy
on public.finance_settings
for select
to authenticated
using (true);

drop policy if exists finance_settings_write_policy on public.finance_settings;
create policy finance_settings_write_policy
on public.finance_settings
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

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
  from public.apartments a;

  return v_period_id;
end;
$$;

create or replace function public.create_special_assessment(
  p_title text,
  p_per_apartment_amount numeric,
  p_due_date date,
  p_period_id uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment_id uuid;
begin
  if not public.is_manager(auth.uid()) then
    raise exception 'only manager can create special assessments';
  end if;

  insert into public.special_assessments (
    period_id,
    title,
    description,
    per_apartment_amount,
    due_date,
    created_by
  )
  values (
    p_period_id,
    p_title,
    p_description,
    p_per_apartment_amount,
    p_due_date,
    auth.uid()
  )
  returning id into v_assessment_id;

  insert into public.charges (
    apartment_id,
    period_id,
    charge_type,
    title,
    amount,
    due_date,
    created_by
  )
  select
    a.id,
    p_period_id,
    'special_assessment'::public.charge_type,
    p_title,
    p_per_apartment_amount,
    p_due_date,
    auth.uid()
  from public.apartments a;

  return v_assessment_id;
end;
$$;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_manager());

drop policy if exists memberships_select_policy on public.apartment_memberships;
create policy memberships_select_policy
on public.apartment_memberships
for select
to authenticated
using (user_id = auth.uid() or public.is_manager());

drop policy if exists memberships_write_policy on public.apartment_memberships;
create policy memberships_write_policy
on public.apartment_memberships
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists periods_write_policy on public.periods;
create policy periods_write_policy
on public.periods
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists charges_write_policy on public.charges;
create policy charges_write_policy
on public.charges
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists payments_write_policy on public.payments;
create policy payments_write_policy
on public.payments
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists expenses_write_policy on public.expenses;
create policy expenses_write_policy
on public.expenses
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists assessments_write_policy on public.special_assessments;
create policy assessments_write_policy
on public.special_assessments
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists expense_categories_write_policy on public.expense_categories;
create policy expense_categories_write_policy
on public.expense_categories
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists invitations_select_policy on public.apartment_invitations;
create policy invitations_select_policy
on public.apartment_invitations
for select
to authenticated
using (
  public.is_manager()
  or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

drop policy if exists invitations_write_policy on public.apartment_invitations;
create policy invitations_write_policy
on public.apartment_invitations
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());
