drop policy if exists profiles_insert_self_policy on public.profiles;
create policy profiles_insert_self_policy
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and (
    role = 'resident'
    or (
      role = 'admin'
      and not exists (
        select 1
        from public.profiles p
        where p.role = 'admin'
      )
    )
  )
);

with admin_exists as (
  select exists (
    select 1
    from public.profiles
    where role = 'admin'
  ) as has_admin
),
missing_users as (
  select
    u.id,
    coalesce(u.email, u.id::text || '@local.invalid') as email,
    coalesce(u.raw_user_meta_data ->> 'full_name', '') as full_name,
    row_number() over (order by u.created_at asc, u.id asc) as rn
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  where p.id is null
)
insert into public.profiles (id, email, full_name, role)
select
  m.id,
  m.email,
  m.full_name,
  case
    when not (select has_admin from admin_exists) and m.rn = 1
      then 'admin'::public.app_role
    else 'resident'::public.app_role
  end as role
from missing_users m
on conflict (id) do nothing;
