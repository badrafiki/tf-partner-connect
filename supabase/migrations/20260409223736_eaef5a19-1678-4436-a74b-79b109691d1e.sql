
CREATE OR REPLACE FUNCTION public.validate_order_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed','in_progress','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_erp_sync_log_direction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.direction NOT IN ('portal_to_modusys','modusys_to_portal') THEN
    RAISE EXCEPTION 'Invalid direction: %', NEW.direction;
  END IF;
  IF NEW.status NOT IN ('success','error','pending') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
