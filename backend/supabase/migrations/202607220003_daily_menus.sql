begin;

create table public.daily_menus (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  service_date date not null,
  status text not null default 'published' check(status in('draft','published','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id,service_date)
);

create table public.daily_menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  daily_menu_id uuid not null references public.daily_menus(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  availability text not null default 'available' check(availability in('available','sold_out')),
  price_override numeric(12,2) check(price_override is null or price_override>=0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(daily_menu_id,product_id)
);

create index daily_menus_tenant_date_idx on public.daily_menus(tenant_id,service_date);
create index daily_menu_items_menu_idx on public.daily_menu_items(daily_menu_id,availability);
create trigger daily_menus_set_updated_at before update on public.daily_menus for each row execute function public.set_updated_at();
create trigger daily_menu_items_set_updated_at before update on public.daily_menu_items for each row execute function public.set_updated_at();

alter table public.daily_menus enable row level security;
alter table public.daily_menu_items enable row level security;
create policy daily_menus_member_all on public.daily_menus for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy daily_menu_items_member_all on public.daily_menu_items for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
grant select,insert,update,delete on public.daily_menus,public.daily_menu_items to authenticated;

commit;
