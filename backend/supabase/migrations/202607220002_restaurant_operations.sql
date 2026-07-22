begin;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,name)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null, name text not null,
  description text, price numeric(12,2) not null default 0 check(price>=0), is_active boolean not null default true,
  sends_to_kitchen boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,name)
);
create table public.dining_areas (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade, name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(branch_id,name)
);
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade, area_id uuid references public.dining_areas(id) on delete set null,
  name text not null, seats integer not null default 4 check(seats>0), status text not null default 'free' check(status in('free','occupied','reserved','disabled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(branch_id,name)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict, table_id uuid references public.dining_tables(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, order_number bigint generated always as identity,
  service_type text not null default 'table' check(service_type in('table','takeaway','delivery')),
  customer_name text, status text not null default 'new' check(status in('new','preparing','ready','delivered','paid','cancelled')),
  subtotal numeric(12,2) not null default 0, discount numeric(12,2) not null default 0, tax numeric(12,2) not null default 0, total numeric(12,2) not null default 0,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null,
  product_name text not null, unit_price numeric(12,2) not null, quantity numeric(10,2) not null check(quantity>0), notes text,
  status text not null default 'new' check(status in('new','preparing','ready','delivered','cancelled')), created_at timestamptz not null default now()
);
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict, opened_by uuid references auth.users(id) on delete set null,
  closed_by uuid references auth.users(id) on delete set null, opening_amount numeric(12,2) not null default 0,
  closing_amount numeric(12,2), status text not null default 'open' check(status in('open','closed')),
  opened_at timestamptz not null default now(), closed_at timestamptz, notes text
);
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade, created_by uuid references auth.users(id) on delete set null,
  kind text not null check(kind in('income','expense')), amount numeric(12,2) not null check(amount>0), concept text not null, created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict, cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  received_by uuid references auth.users(id) on delete set null, method text not null check(method in('cash','card','transfer','mixed')),
  amount numeric(12,2) not null check(amount>0), created_at timestamptz not null default now()
);

create index products_tenant_idx on public.products(tenant_id,is_active);
create index tables_branch_idx on public.dining_tables(branch_id,status);
create index orders_tenant_time_idx on public.orders(tenant_id,created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index cash_sessions_branch_idx on public.cash_sessions(branch_id,status);

create trigger categories_set_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger areas_set_updated_at before update on public.dining_areas for each row execute function public.set_updated_at();
create trigger tables_set_updated_at before update on public.dining_tables for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security; alter table public.products enable row level security;
alter table public.dining_areas enable row level security; alter table public.dining_tables enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.cash_sessions enable row level security; alter table public.cash_movements enable row level security; alter table public.payments enable row level security;

create policy categories_member_all on public.product_categories for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy products_member_all on public.products for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy areas_member_all on public.dining_areas for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy tables_member_all on public.dining_tables for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy orders_member_all on public.orders for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy items_member_all on public.order_items for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy cash_sessions_member_all on public.cash_sessions for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy cash_movements_member_all on public.cash_movements for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy payments_member_all on public.payments for all to authenticated using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));

grant select,insert,update,delete on public.product_categories,public.products,public.dining_areas,public.dining_tables,public.orders,public.order_items,public.cash_sessions,public.cash_movements,public.payments to authenticated;
grant usage,select on sequence public.orders_order_number_seq to authenticated;
commit;
