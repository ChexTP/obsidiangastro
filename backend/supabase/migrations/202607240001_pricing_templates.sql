begin;

create table public.pricing_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  base_price numeric(12,2) not null check(base_price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,name)
);

create table public.template_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_id uuid not null references public.pricing_templates(id) on delete cascade,
  category_id uuid not null references public.product_categories(id) on delete restrict,
  quantity integer not null default 1 check(quantity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id,category_id)
);

alter table public.products
  add column if not exists template_surcharge numeric(12,2) not null default 0
    check(template_surcharge >= 0);

alter table public.order_items
  add column if not exists template_id uuid references public.pricing_templates(id) on delete set null,
  add column if not exists line_type text not null default 'product'
    check(line_type in ('product','preparation'));

create index pricing_templates_tenant_idx on public.pricing_templates(tenant_id,is_active);
create index template_requirements_template_idx on public.template_requirements(template_id,sort_order);
create trigger pricing_templates_set_updated_at before update on public.pricing_templates
for each row execute function public.set_updated_at();
create trigger template_requirements_set_updated_at before update on public.template_requirements
for each row execute function public.set_updated_at();

alter table public.pricing_templates enable row level security;
alter table public.template_requirements enable row level security;
create policy pricing_templates_member_all on public.pricing_templates for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
create policy template_requirements_member_all on public.template_requirements for all to authenticated
using(public.is_active_tenant_member(tenant_id)) with check(public.is_active_tenant_member(tenant_id));
grant select,insert,update,delete on public.pricing_templates,public.template_requirements to authenticated;

-- Los combos anteriores se conservan para el historial, pero dejan de aparecer
-- como productos vendibles para evitar mezclar ambos modelos.
update public.products set is_active=false where product_type='composite';

commit;
