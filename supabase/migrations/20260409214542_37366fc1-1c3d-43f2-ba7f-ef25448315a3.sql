
-- Trigger 1: Price change notification
create or replace function public.notify_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.list_price_usd is distinct from NEW.list_price_usd then
    insert into notifications (partner_id, type, message)
    select
      p.id,
      'price_change',
      'Price update: ' || NEW.name || ' is now $' || NEW.list_price_usd::text || ' (was $' || OLD.list_price_usd::text || ')'
    from partners p
    where p.active = true;
  end if;
  return NEW;
end;
$$;

create trigger on_product_price_change
  after update on products
  for each row
  execute function public.notify_price_change();

-- Trigger 2: Stock update notification
create or replace function public.notify_stock_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.stock_qty = 0 and NEW.stock_qty > 0 then
    insert into notifications (partner_id, type, message)
    select
      p.id,
      'stock_update',
      NEW.name || ' is back in stock (' || NEW.stock_qty::text || ' units available)'
    from partners p
    where p.active = true;
  end if;

  if OLD.stock_qty > 0 and NEW.stock_qty = 0 then
    insert into notifications (partner_id, type, message)
    select
      p.id,
      'stock_update',
      NEW.name || ' is now out of stock'
    from partners p
    where p.active = true;
  end if;

  return NEW;
end;
$$;

create trigger on_product_stock_change
  after update on products
  for each row
  execute function public.notify_stock_change();

-- Trigger 3: Quotation issued notification
create or replace function public.notify_quotation_issued()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'pending' then
    insert into notifications (partner_id, type, message)
    values (
      NEW.partner_id,
      'quotation_issued',
      'A new quotation has been issued for your enquiry. Log in to view and respond.'
    );
  end if;
  return NEW;
end;
$$;

create trigger on_quotation_created
  after insert on quotations
  for each row
  execute function public.notify_quotation_issued();
