begin;

alter table public.daily_menu_items
  add column stock_quantity integer,
  add column remaining_quantity integer,
  add constraint daily_menu_items_stock_nonnegative check(stock_quantity is null or stock_quantity>=0),
  add constraint daily_menu_items_remaining_nonnegative check(remaining_quantity is null or remaining_quantity>=0),
  add constraint daily_menu_items_stock_pair check(
    (stock_quantity is null and remaining_quantity is null)
    or (stock_quantity is not null and remaining_quantity is not null and remaining_quantity<=stock_quantity)
  );

commit;
