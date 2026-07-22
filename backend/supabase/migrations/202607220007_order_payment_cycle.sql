begin;

alter table public.order_items
  add column daily_menu_item_id uuid references public.daily_menu_items(id) on delete set null;

create index order_items_daily_menu_idx on public.order_items(daily_menu_item_id)
  where daily_menu_item_id is not null;

commit;
