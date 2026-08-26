drop trigger if exists on_product_price_change on public.products;
drop function if exists public.notify_price_change();