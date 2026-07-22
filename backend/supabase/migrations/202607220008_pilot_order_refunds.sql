begin;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new','preparing','ready','delivered','paid','cancelled','refunded'));

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  method text not null check (method in ('cash','card','transfer')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index refunds_tenant_time_idx on public.refunds(tenant_id, created_at desc);
create index refunds_order_idx on public.refunds(order_id);
alter table public.refunds enable row level security;
create policy refunds_member_all on public.refunds for all to authenticated
  using(public.is_active_tenant_member(tenant_id))
  with check(public.is_active_tenant_member(tenant_id));
grant select,insert,update,delete on public.refunds to authenticated;

comment on table public.refunds is 'Devoluciones completas de pedidos pagados, asociadas al turno donde se devuelve el dinero.';

commit;
