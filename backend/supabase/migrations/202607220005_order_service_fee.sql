begin;

alter table public.orders
  add column service_fee numeric(12,2) not null default 0 check(service_fee>=0);

comment on column public.orders.service_fee is
  'Cargo sencillo por domicilio o empaque, según service_type.';

commit;
