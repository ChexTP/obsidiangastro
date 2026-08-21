begin;

create table public.product_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer check(quantity is null or quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, product_id)
);

create index product_inventory_tenant_idx on public.product_inventory(tenant_id);
create trigger product_inventory_set_updated_at before update on public.product_inventory
for each row execute function public.set_updated_at();
alter table public.product_inventory enable row level security;
create policy product_inventory_member_all on public.product_inventory for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
grant select,insert,update,delete on public.product_inventory to authenticated;

insert into public.product_inventory(tenant_id,product_id,quantity)
select distinct on (dmi.tenant_id,dmi.product_id)
  dmi.tenant_id,dmi.product_id,dmi.remaining_quantity
from public.daily_menu_items dmi
join public.daily_menus dm on dm.id=dmi.daily_menu_id
where dmi.remaining_quantity is not null
order by dmi.tenant_id,dmi.product_id,dm.service_date desc,dmi.created_at desc
on conflict(tenant_id,product_id) do nothing;

commit;
