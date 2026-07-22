begin;

create extension if not exists pgcrypto;

create type public.membership_role as enum (
  'owner', 'admin', 'cashier', 'waiter', 'kitchen', 'auditor'
);
create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled', 'archived'
);
create type public.session_kind as enum ('mobile', 'admin_web', 'cashier_web', 'kitchen_web');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  country_code char(2) not null default 'CO',
  currency char(3) not null default 'COP',
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  restaurant_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name),
  unique (id, tenant_id),
  foreign key (restaurant_id, tenant_id)
    references public.restaurants(id, tenant_id) on delete restrict
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  grace_ends_at timestamptz,
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid,
  kind public.session_kind not null,
  device_fingerprint text not null,
  device_name text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, device_fingerprint, kind),
  foreign key (branch_id, tenant_id)
    references public.branches(id, tenant_id) on delete restrict
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index tenant_memberships_user_idx on public.tenant_memberships(user_id, status);
create index restaurants_tenant_idx on public.restaurants(tenant_id);
create index branches_tenant_idx on public.branches(tenant_id);
create index device_sessions_active_idx on public.device_sessions(tenant_id, kind, last_seen_at)
  where revoked_at is null;
create index audit_events_tenant_time_idx on public.audit_events(tenant_id, occurred_at desc);

insert into public.plans (code, name, description, limits)
values (
  'base',
  'Plan Base',
  'Una sede, diez empleados y dos conexiones móviles simultáneas.',
  '{"restaurants": 1, "branches": 1, "registered_users": 10, "mobile_concurrent_sessions": 2, "admin_web_sessions": 1, "cashier_web_sessions": 1, "kitchen_web_sessions": 1}'::jsonb
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plans_set_updated_at before update on public.plans
for each row execute function public.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
create trigger restaurants_set_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches
for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.tenant_memberships
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.is_active_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(
  p_tenant_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(p_roles)
  );
$$;

revoke all on function public.is_active_tenant_member(uuid) from public;
grant execute on function public.is_active_tenant_member(uuid) to authenticated;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public;
grant execute on function public.has_tenant_role(uuid, public.membership_role[]) to authenticated;

create or replace function public.bootstrap_restaurant_account(
  p_business_name text,
  p_restaurant_name text,
  p_branch_name text default 'Sede principal',
  p_timezone text default 'America/Bogota',
  p_currency text default 'COP'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_restaurant_id uuid;
  v_branch_id uuid;
  v_plan_id uuid;
  v_subscription_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if exists (select 1 from public.tenant_memberships where user_id = v_user_id and status = 'active') then
    raise exception 'User already belongs to an account' using errcode = '23505';
  end if;
  if char_length(trim(p_business_name)) not between 2 and 120
     or char_length(trim(p_restaurant_name)) not between 2 and 120
     or char_length(trim(p_branch_name)) not between 2 and 120 then
    raise exception 'Invalid account names' using errcode = '22023';
  end if;
  if char_length(trim(p_currency)) <> 3 then
    raise exception 'Currency must use a three-letter ISO code' using errcode = '22023';
  end if;

  select id into v_plan_id from public.plans where code = 'base' and is_active = true;
  if v_plan_id is null then
    raise exception 'Base plan is unavailable';
  end if;

  insert into public.tenants (business_name, currency, timezone)
  values (trim(p_business_name), upper(trim(p_currency)), trim(p_timezone))
  returning id into v_tenant_id;

  insert into public.restaurants (tenant_id, name)
  values (v_tenant_id, trim(p_restaurant_name))
  returning id into v_restaurant_id;

  insert into public.branches (tenant_id, restaurant_id, name, timezone)
  values (v_tenant_id, v_restaurant_id, trim(p_branch_name), trim(p_timezone))
  returning id into v_branch_id;

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'owner');

  insert into public.subscriptions (tenant_id, plan_id, status, trial_ends_at)
  values (v_tenant_id, v_plan_id, 'trialing', now() + interval '15 days')
  returning id into v_subscription_id;

  insert into public.audit_events (tenant_id, actor_user_id, event_type, entity_type, entity_id)
  values (v_tenant_id, v_user_id, 'tenant.created', 'tenant', v_tenant_id);

  return jsonb_build_object(
    'tenantId', v_tenant_id,
    'restaurantId', v_restaurant_id,
    'branchId', v_branch_id,
    'subscriptionId', v_subscription_id,
    'trialEndsAt', now() + interval '15 days'
  );
end;
$$;

revoke all on function public.bootstrap_restaurant_account(text, text, text, text, text) from public;
grant execute on function public.bootstrap_restaurant_account(text, text, text, text, text) to authenticated;

alter table public.plans enable row level security;
alter table public.tenants enable row level security;
alter table public.restaurants enable row level security;
alter table public.branches enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.device_sessions enable row level security;
alter table public.audit_events enable row level security;

create policy plans_read_authenticated on public.plans
for select to authenticated using (is_active = true);

create policy tenants_read_members on public.tenants
for select to authenticated using (public.is_active_tenant_member(id));

create policy restaurants_read_members on public.restaurants
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy restaurants_manage_admins on public.restaurants
for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]));

create policy branches_read_members on public.branches
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy branches_manage_admins on public.branches
for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]));

create policy memberships_read_same_tenant on public.tenant_memberships
for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy memberships_insert_authorized on public.tenant_memberships
for insert to authenticated
with check (
  public.has_tenant_role(tenant_id, array['owner']::public.membership_role[])
  or (
    role <> 'owner'
    and public.has_tenant_role(tenant_id, array['admin']::public.membership_role[])
  )
);
create policy memberships_update_authorized on public.tenant_memberships
for update to authenticated
using (
  public.has_tenant_role(tenant_id, array['owner']::public.membership_role[])
  or (
    role <> 'owner'
    and public.has_tenant_role(tenant_id, array['admin']::public.membership_role[])
  )
)
with check (
  public.has_tenant_role(tenant_id, array['owner']::public.membership_role[])
  or (
    role <> 'owner'
    and public.has_tenant_role(tenant_id, array['admin']::public.membership_role[])
  )
);
create policy memberships_delete_authorized on public.tenant_memberships
for delete to authenticated
using (
  public.has_tenant_role(tenant_id, array['owner']::public.membership_role[])
  or (
    role <> 'owner'
    and public.has_tenant_role(tenant_id, array['admin']::public.membership_role[])
  )
);

create policy subscriptions_read_admins on public.subscriptions
for select to authenticated
using (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]));

create policy device_sessions_read_own_or_admin on public.device_sessions
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[])
);

create policy audit_events_read_authorized on public.audit_events
for select to authenticated
using (public.has_tenant_role(tenant_id, array['owner','admin','auditor']::public.membership_role[]));

grant usage on schema public to authenticated;
grant select on public.plans to authenticated;
grant select on public.tenants, public.restaurants, public.branches, public.tenant_memberships,
  public.subscriptions, public.device_sessions, public.audit_events to authenticated;
grant insert, update on public.restaurants, public.branches, public.tenant_memberships to authenticated;

commit;
