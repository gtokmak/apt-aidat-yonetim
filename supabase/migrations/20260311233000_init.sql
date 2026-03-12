create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'resident');
create type public.charge_type as enum ('monthly_due', 'special_assessment');

create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  number smallint not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'resident',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apartment_memberships (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (apartment_id, user_id)
);

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  period_month date not null unique,
  monthly_due numeric(12, 2) not null check (monthly_due > 0),
  carry_over numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (period_month = date_trunc('month', period_month)::date)
);

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  period_id uuid references public.periods (id) on delete set null,
  charge_type public.charge_type not null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index if not exists charges_monthly_due_unique_idx
  on public.charges (apartment_id, period_id, charge_type)
  where charge_type = 'monthly_due';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  payer_user_id uuid references auth.users (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.periods (id) on delete set null,
  category text not null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  spent_at date not null default current_date,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.special_assessments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.periods (id) on delete set null,
  title text not null,
  description text,
  per_apartment_amount numeric(12, 2) not null check (per_apartment_amount > 0),
  due_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_admin boolean;
begin
  select exists (select 1 from public.profiles p where p.role = 'admin') into has_admin;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when has_admin then 'resident'::public.app_role
      else 'admin'::public.app_role
    end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(p_user_id uuid default auth.uid())
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
      and p.role = 'admin'
  );
$$;

create or replace function public.user_belongs_to_apartment(
  p_apartment_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.apartment_memberships m
    where m.apartment_id = p_apartment_id
      and m.user_id = p_user_id
  );
$$;

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
  if not public.is_admin(auth.uid()) then
    raise exception 'only admin can create periods';
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
  if not public.is_admin(auth.uid()) then
    raise exception 'only admin can create special assessments';
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

create or replace view public.apartment_balance_summary as
select
  a.id as apartment_id,
  a.number as apartment_no,
  a.label as apartment_label,
  coalesce(ch.total_charges, 0)::numeric(12, 2) as total_charges,
  coalesce(py.total_payments, 0)::numeric(12, 2) as total_payments,
  (coalesce(ch.total_charges, 0) - coalesce(py.total_payments, 0))::numeric(12, 2) as balance
from public.apartments a
left join (
  select c.apartment_id, sum(c.amount) as total_charges
  from public.charges c
  group by c.apartment_id
) ch on ch.apartment_id = a.id
left join (
  select p.apartment_id, sum(p.amount) as total_payments
  from public.payments p
  group by p.apartment_id
) py on py.apartment_id = a.id;

insert into public.apartments (number, label)
select gs, 'Daire ' || gs::text
from generate_series(1, 7) gs
on conflict (number) do nothing;

grant usage on schema public to authenticated;
grant select on public.apartment_balance_summary to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_belongs_to_apartment(uuid, uuid) to authenticated;
grant execute on function public.create_period_with_dues(date, numeric, text) to authenticated;
grant execute on function public.create_special_assessment(text, numeric, date, uuid, text) to authenticated;

alter table public.apartments enable row level security;
alter table public.profiles enable row level security;
alter table public.apartment_memberships enable row level security;
alter table public.periods enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.special_assessments enable row level security;

drop policy if exists apartments_select_policy on public.apartments;
create policy apartments_select_policy
on public.apartments
for select
to authenticated
using (public.is_admin() or public.user_belongs_to_apartment(id));

drop policy if exists apartments_write_policy on public.apartments;
create policy apartments_write_policy
on public.apartments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists memberships_select_policy on public.apartment_memberships;
create policy memberships_select_policy
on public.apartment_memberships
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists memberships_write_policy on public.apartment_memberships;
create policy memberships_write_policy
on public.apartment_memberships
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists periods_select_policy on public.periods;
create policy periods_select_policy
on public.periods
for select
to authenticated
using (true);

drop policy if exists periods_write_policy on public.periods;
create policy periods_write_policy
on public.periods
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists charges_select_policy on public.charges;
create policy charges_select_policy
on public.charges
for select
to authenticated
using (public.is_admin() or public.user_belongs_to_apartment(apartment_id));

drop policy if exists charges_write_policy on public.charges;
create policy charges_write_policy
on public.charges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payments_select_policy on public.payments;
create policy payments_select_policy
on public.payments
for select
to authenticated
using (public.is_admin() or public.user_belongs_to_apartment(apartment_id));

drop policy if exists payments_write_policy on public.payments;
create policy payments_write_policy
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists expenses_select_policy on public.expenses;
create policy expenses_select_policy
on public.expenses
for select
to authenticated
using (true);

drop policy if exists expenses_write_policy on public.expenses;
create policy expenses_write_policy
on public.expenses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists assessments_select_policy on public.special_assessments;
create policy assessments_select_policy
on public.special_assessments
for select
to authenticated
using (true);

drop policy if exists assessments_write_policy on public.special_assessments;
create policy assessments_write_policy
on public.special_assessments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
