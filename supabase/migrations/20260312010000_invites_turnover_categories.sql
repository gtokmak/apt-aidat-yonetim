do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'occupant_type'
      and n.nspname = 'public'
  ) then
    create type public.occupant_type as enum ('owner', 'tenant');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'invitation_status'
      and n.nspname = 'public'
  ) then
    create type public.invitation_status as enum ('pending', 'accepted', 'cancelled', 'failed');
  end if;
end
$$;

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

insert into public.expense_categories (name)
values
  ('Temizlik'),
  ('Elektrik'),
  ('Su'),
  ('Bakim'),
  ('Asansor'),
  ('Guvenlik'),
  ('Bahce'),
  ('Diger')
on conflict (name) do nothing;

alter table public.expenses
add column if not exists category_id uuid references public.expense_categories (id);

update public.expenses e
set category_id = c.id
from public.expense_categories c
where e.category_id is null
  and lower(e.category) = lower(c.name);

alter table public.apartment_memberships
add column if not exists occupant_type public.occupant_type not null default 'tenant';

alter table public.apartment_memberships
add column if not exists started_at date not null default current_date;

alter table public.apartment_memberships
add column if not exists ended_at date;

alter table public.apartment_memberships
add column if not exists notes text;

alter table public.apartment_memberships
drop constraint if exists apartment_memberships_apartment_id_user_id_key;

create unique index if not exists apartment_memberships_unique_period_idx
  on public.apartment_memberships (apartment_id, user_id, started_at);

create unique index if not exists apartment_memberships_one_active_tenant_idx
  on public.apartment_memberships (apartment_id)
  where occupant_type = 'tenant' and ended_at is null;

alter table public.apartment_memberships
drop constraint if exists apartment_memberships_dates_check;

alter table public.apartment_memberships
add constraint apartment_memberships_dates_check
check (ended_at is null or ended_at >= started_at);

create table if not exists public.apartment_invitations (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  email text not null,
  occupant_type public.occupant_type not null default 'tenant',
  starts_on date not null default current_date,
  ends_on date,
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users (id),
  invited_user_id uuid references auth.users (id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  note text,
  check (ends_on is null or ends_on >= starts_on)
);

create unique index if not exists apartment_invitations_pending_unique_idx
  on public.apartment_invitations (apartment_id, lower(email))
  where status = 'pending';

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
      and m.started_at <= current_date
      and (m.ended_at is null or m.ended_at >= current_date)
  );
$$;

create or replace function public.accept_apartment_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.apartment_invitations%rowtype;
  v_user_id uuid;
  v_user_email text;
  v_membership_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select u.email into v_user_email
  from auth.users u
  where u.id = v_user_id;

  select *
  into v_invitation
  from public.apartment_invitations ai
  where ai.id = p_invitation_id
    and ai.status = 'pending'
  for update;

  if not found then
    raise exception 'invitation not found or already used';
  end if;

  if lower(coalesce(v_invitation.email, '')) <> lower(coalesce(v_user_email, '')) then
    raise exception 'invitation email does not match current user';
  end if;

  insert into public.apartment_memberships (
    apartment_id,
    user_id,
    created_by,
    occupant_type,
    started_at,
    ended_at,
    notes
  )
  values (
    v_invitation.apartment_id,
    v_user_id,
    v_invitation.invited_by,
    v_invitation.occupant_type,
    v_invitation.starts_on,
    v_invitation.ends_on,
    v_invitation.note
  )
  on conflict (apartment_id, user_id, started_at)
  do update set
    ended_at = excluded.ended_at,
    occupant_type = excluded.occupant_type,
    notes = excluded.notes
  returning id into v_membership_id;

  update public.apartment_invitations
  set
    status = 'accepted',
    invited_user_id = v_user_id,
    accepted_at = now()
  where id = v_invitation.id;

  return v_membership_id;
end;
$$;

grant execute on function public.accept_apartment_invitation(uuid) to authenticated;

alter table public.expense_categories enable row level security;
alter table public.apartment_invitations enable row level security;

drop policy if exists expense_categories_select_policy on public.expense_categories;
create policy expense_categories_select_policy
on public.expense_categories
for select
to authenticated
using (true);

drop policy if exists expense_categories_write_policy on public.expense_categories;
create policy expense_categories_write_policy
on public.expense_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists invitations_select_policy on public.apartment_invitations;
create policy invitations_select_policy
on public.apartment_invitations
for select
to authenticated
using (
  public.is_admin()
  or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

drop policy if exists invitations_write_policy on public.apartment_invitations;
create policy invitations_write_policy
on public.apartment_invitations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
