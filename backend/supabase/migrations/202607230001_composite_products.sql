begin;

alter table public.products
  add column if not exists product_type text not null default 'simple'
    check (product_type in ('simple','composite'));

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  minimum_selections integer not null default 1 check (minimum_selections >= 0),
  maximum_selections integer not null default 1 check (maximum_selections > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_selections <= maximum_selections)
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  group_id uuid not null references public.product_option_groups(id) on delete cascade,
  component_product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  price_delta numeric(12,2) not null default 0 check (price_delta >= 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_menu_option_stocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  daily_menu_id uuid not null references public.daily_menus(id) on delete cascade,
  option_id uuid not null references public.product_options(id) on delete cascade,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  remaining_quantity integer check (remaining_quantity is null or remaining_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(daily_menu_id,option_id)
);

alter table public.order_items
  add column if not exists selections jsonb not null default '[]'::jsonb;

create index product_option_groups_product_idx on public.product_option_groups(product_id,sort_order);
create index product_options_group_idx on public.product_options(group_id,sort_order);
create index product_options_component_idx on public.product_options(component_product_id);
create index daily_menu_option_stocks_menu_idx on public.daily_menu_option_stocks(daily_menu_id,option_id);
create trigger product_option_groups_set_updated_at before update on public.product_option_groups
for each row execute function public.set_updated_at();
create trigger product_options_set_updated_at before update on public.product_options
for each row execute function public.set_updated_at();
create trigger daily_menu_option_stocks_set_updated_at before update on public.daily_menu_option_stocks
for each row execute function public.set_updated_at();

alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.daily_menu_option_stocks enable row level security;
create policy product_option_groups_member_all on public.product_option_groups for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy product_options_member_all on public.product_options for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy daily_menu_option_stocks_member_all on public.daily_menu_option_stocks for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
grant select,insert,update,delete on public.product_option_groups,public.product_options,public.daily_menu_option_stocks to authenticated;

commit;
