
-- Track ModuSys customer ID on partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS modusys_customer_id uuid,
  ADD COLUMN IF NOT EXISTS modusys_synced_at timestamptz;

-- Track ModuSys quote ID on quotations
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS modusys_quote_id uuid,
  ADD COLUMN IF NOT EXISTS modusys_synced_at timestamptz;

-- New: orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  modusys_order_id uuid,
  modusys_order_number text,
  status text NOT NULL DEFAULT 'confirmed',
  carrier text,
  tracking_number text,
  shipped_date timestamptz,
  delivered_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger for orders status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_order_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed','in_progress','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_order_status_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status();

-- New: erp_sync_log table
CREATE TABLE IF NOT EXISTS erp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  direction text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  modusys_entity_id uuid,
  status text NOT NULL,
  payload jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Validation triggers for erp_sync_log
CREATE OR REPLACE FUNCTION public.validate_erp_sync_log_direction()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE TRIGGER validate_erp_sync_log_trigger
  BEFORE INSERT OR UPDATE ON erp_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_erp_sync_log_direction();

-- RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON orders
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner reads own orders" ON orders
  FOR SELECT USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- RLS for erp_sync_log (admin only)
ALTER TABLE erp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON erp_sync_log
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- orders_partner_view
CREATE OR REPLACE VIEW orders_partner_view
  WITH (security_invoker = true, security_barrier = true)
AS
  SELECT
    id, quotation_id, partner_id,
    modusys_order_number,
    status, carrier, tracking_number,
    shipped_date, delivered_date, notes, created_at
  FROM orders;

-- Notifications trigger for order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (partner_id, type, message)
    VALUES (
      NEW.partner_id,
      'order_update',
      CASE NEW.status
        WHEN 'in_progress'  THEN 'Your order ' || COALESCE(NEW.modusys_order_number, '') || ' is now being processed.'
        WHEN 'shipped'      THEN 'Your order ' || COALESCE(NEW.modusys_order_number, '') || ' has been shipped.' ||
                                 CASE WHEN NEW.tracking_number IS NOT NULL
                                   THEN ' Tracking: ' || NEW.tracking_number
                                   ELSE ''
                                 END
        WHEN 'delivered'    THEN 'Your order ' || COALESCE(NEW.modusys_order_number, '') || ' has been delivered.'
        WHEN 'cancelled'    THEN 'Your order ' || COALESCE(NEW.modusys_order_number, '') || ' has been cancelled. Please contact your rep.'
        ELSE 'Your order status has been updated to: ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
