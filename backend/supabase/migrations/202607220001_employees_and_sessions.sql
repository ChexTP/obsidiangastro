begin;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_memberships
  add column invited_by uuid references auth.users(id) on delete set null;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
      updated_at = now();
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.user_profiles (user_id, email, display_name)
select id, email, coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'name')
from auth.users
on conflict (user_id) do nothing;

create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

create or replace function public.invite_tenant_member(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role public.membership_role,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.membership_role;
  v_limit integer;
  v_current integer;
  v_membership_id uuid;
begin
  select role into v_actor_role
  from public.tenant_memberships
  where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'active';

  if v_actor_role not in ('owner', 'admin') then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;
  if p_role = 'owner' and v_actor_role <> 'owner' then
    raise exception 'Only an owner can invite another owner' using errcode = '42501';
  end if;

  select coalesce(
    (subscription.overrides ->> 'registered_users')::integer,
    (plan.limits ->> 'registered_users')::integer,
    10
  ) into v_limit
  from public.subscriptions subscription
  join public.plans plan on plan.id = subscription.plan_id
  where subscription.tenant_id = p_tenant_id
    and subscription.status in ('trialing', 'active', 'grace_period');

  if v_limit is null then
    raise exception 'Subscription is not active' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':members', 0));
  select count(*) into v_current
  from public.tenant_memberships
  where tenant_id = p_tenant_id and status in ('active', 'invited');

  if v_current >= v_limit then
    raise exception 'Registered user limit reached' using errcode = 'P0001';
  end if;

  insert into public.user_profiles (user_id, display_name)
  values (p_user_id, nullif(trim(p_display_name), ''))
  on conflict (user_id) do update
  set display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
      updated_at = now();

  insert into public.tenant_memberships (tenant_id, user_id, role, status, invited_by)
  values (p_tenant_id, p_user_id, p_role, 'invited', auth.uid())
  returning id into v_membership_id;

  insert into public.audit_events (tenant_id, actor_user_id, event_type, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'employee.invited', 'tenant_membership', v_membership_id,
    jsonb_build_object('userId', p_user_id, 'role', p_role));

  return jsonb_build_object('membershipId', v_membership_id, 'status', 'invited');
end;
$$;

create or replace function public.accept_tenant_invitation(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.tenant_memberships;
begin
  update public.tenant_memberships
  set status = 'active', updated_at = now()
  where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'invited'
  returning * into v_membership;
  if v_membership.id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  insert into public.audit_events (tenant_id, actor_user_id, event_type, entity_type, entity_id)
  values (p_tenant_id, auth.uid(), 'employee.invitation_accepted', 'tenant_membership', v_membership.id);
  return jsonb_build_object('membershipId', v_membership.id, 'status', 'active');
end;
$$;

create or replace function public.open_device_session(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_kind public.session_kind,
  p_device_fingerprint text,
  p_device_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit_key text;
  v_limit integer;
  v_active integer;
  v_session_id uuid;
begin
  if v_user_id is null or not public.is_active_tenant_member(p_tenant_id) then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  if char_length(trim(p_device_fingerprint)) not between 8 and 200 then
    raise exception 'Invalid device fingerprint' using errcode = '22023';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and tenant_id = p_tenant_id and status = 'active'
  ) then
    raise exception 'Invalid branch' using errcode = '22023';
  end if;

  v_limit_key := case p_kind
    when 'mobile' then 'mobile_concurrent_sessions'
    when 'admin_web' then 'admin_web_sessions'
    when 'cashier_web' then 'cashier_web_sessions'
    when 'kitchen_web' then 'kitchen_web_sessions'
  end;

  select coalesce(
    (subscription.overrides ->> v_limit_key)::integer,
    (plan.limits ->> v_limit_key)::integer,
    0
  ) into v_limit
  from public.subscriptions subscription
  join public.plans plan on plan.id = subscription.plan_id
  where subscription.tenant_id = p_tenant_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and (subscription.status <> 'trialing' or subscription.trial_ends_at > now())
    and (subscription.status <> 'grace_period' or subscription.grace_ends_at > now());

  if v_limit is null then
    raise exception 'Subscription is not active' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_kind::text, 0));

  update public.device_sessions
  set revoked_at = now()
  where tenant_id = p_tenant_id and kind = p_kind and revoked_at is null
    and last_seen_at < now() - interval '5 minutes';

  select id into v_session_id
  from public.device_sessions
  where tenant_id = p_tenant_id and kind = p_kind
    and device_fingerprint = trim(p_device_fingerprint) and revoked_at is null;

  if v_session_id is not null then
    update public.device_sessions
    set user_id = v_user_id, branch_id = p_branch_id, device_name = p_device_name, last_seen_at = now()
    where id = v_session_id;
  else
    select count(*) into v_active
    from public.device_sessions
    where tenant_id = p_tenant_id and kind = p_kind and revoked_at is null;

    if v_active >= v_limit then
      raise exception 'Concurrent session limit reached' using errcode = 'P0001';
    end if;

    insert into public.device_sessions (
      tenant_id, user_id, branch_id, kind, device_fingerprint, device_name
    ) values (
      p_tenant_id, v_user_id, p_branch_id, p_kind, trim(p_device_fingerprint), p_device_name
    )
    on conflict (tenant_id, device_fingerprint, kind) do update
    set user_id = excluded.user_id,
        branch_id = excluded.branch_id,
        device_name = excluded.device_name,
        last_seen_at = now(),
        revoked_at = null
    returning id into v_session_id;
  end if;

  return jsonb_build_object('sessionId', v_session_id, 'kind', p_kind, 'limit', v_limit);
end;
$$;

create or replace function public.heartbeat_device_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_seen timestamptz;
begin
  update public.device_sessions
  set last_seen_at = now()
  where id = p_session_id and user_id = auth.uid() and revoked_at is null
  returning last_seen_at into v_seen;
  if v_seen is null then raise exception 'Active session not found' using errcode = 'P0002'; end if;
  return v_seen;
end;
$$;

create or replace function public.close_device_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_affected integer;
begin
  update public.device_sessions session
  set revoked_at = now()
  where session.id = p_session_id and session.revoked_at is null
    and (
      session.user_id = auth.uid()
      or public.has_tenant_role(session.tenant_id, array['owner','admin']::public.membership_role[])
    );
  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

revoke all on function public.invite_tenant_member(uuid, uuid, public.membership_role, text) from public;
grant execute on function public.invite_tenant_member(uuid, uuid, public.membership_role, text) to authenticated;
revoke all on function public.accept_tenant_invitation(uuid) from public;
grant execute on function public.accept_tenant_invitation(uuid) to authenticated;
revoke all on function public.open_device_session(uuid, uuid, public.session_kind, text, text) from public;
grant execute on function public.open_device_session(uuid, uuid, public.session_kind, text, text) to authenticated;
revoke all on function public.heartbeat_device_session(uuid) from public;
grant execute on function public.heartbeat_device_session(uuid) to authenticated;
revoke all on function public.close_device_session(uuid) from public;
grant execute on function public.close_device_session(uuid) to authenticated;

alter table public.user_profiles enable row level security;
create policy user_profiles_read_self_or_tenant on public.user_profiles
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.tenant_memberships mine
    join public.tenant_memberships theirs on theirs.tenant_id = mine.tenant_id
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = user_profiles.user_id
  )
);

grant select on public.user_profiles to authenticated;

commit;
