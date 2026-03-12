drop policy if exists apartments_select_policy on public.apartments;
create policy apartments_select_policy
on public.apartments
for select
to authenticated
using (true);

drop policy if exists charges_select_policy on public.charges;
create policy charges_select_policy
on public.charges
for select
to authenticated
using (true);

drop policy if exists payments_select_policy on public.payments;
create policy payments_select_policy
on public.payments
for select
to authenticated
using (true);

create or replace function public.get_apartment_display_names()
returns table (
  apartment_id uuid,
  occupant_type public.occupant_type,
  full_name text,
  started_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.apartment_id,
    m.occupant_type,
    p.full_name,
    m.started_at
  from public.apartment_memberships m
  join public.profiles p
    on p.id = m.user_id
  where m.started_at <= current_date
    and (m.ended_at is null or m.ended_at >= current_date)
  order by
    m.apartment_id asc,
    m.occupant_type asc,
    m.started_at desc;
$$;

grant execute on function public.get_apartment_display_names() to authenticated;
