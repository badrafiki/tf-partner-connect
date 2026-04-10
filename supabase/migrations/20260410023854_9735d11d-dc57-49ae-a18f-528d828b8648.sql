
-- Partner product access rules
CREATE TABLE public.partner_product_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  family text,
  category text,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  access text NOT NULL CHECK (access IN ('allowed', 'denied')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_family_or_product CHECK (
    (family IS NOT NULL AND product_id IS NULL) OR
    (family IS NULL AND product_id IS NOT NULL)
  )
);

-- Unique constraints for no duplicate rules
CREATE UNIQUE INDEX uq_partner_family ON public.partner_product_access (partner_id, family, category) WHERE product_id IS NULL;
CREATE UNIQUE INDEX uq_partner_product ON public.partner_product_access (partner_id, product_id) WHERE product_id IS NOT NULL;

-- RLS: admin only
ALTER TABLE public.partner_product_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON public.partner_product_access
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function to get visible product IDs for a partner
CREATE OR REPLACE FUNCTION public.get_partner_visible_products(p_partner_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_rules boolean;
  has_allowed_families boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM partner_product_access WHERE partner_id = p_partner_id
  ) INTO has_rules;

  IF NOT has_rules THEN
    RETURN QUERY SELECT id FROM products WHERE hidden = false;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM partner_product_access
    WHERE partner_id = p_partner_id
    AND family IS NOT NULL
    AND access = 'allowed'
  ) INTO has_allowed_families;

  RETURN QUERY
  SELECT p.id FROM products p
  WHERE p.hidden = false
  AND (
    EXISTS(
      SELECT 1 FROM partner_product_access ppa
      WHERE ppa.partner_id = p_partner_id
      AND ppa.product_id = p.id
      AND ppa.access = 'allowed'
    )
    OR (
      NOT EXISTS(
        SELECT 1 FROM partner_product_access ppa
        WHERE ppa.partner_id = p_partner_id
        AND ppa.product_id = p.id
        AND ppa.access = 'denied'
      )
      AND (
        (has_allowed_families AND EXISTS(
          SELECT 1 FROM partner_product_access ppa
          WHERE ppa.partner_id = p_partner_id
          AND ppa.family = p.family
          AND ppa.access = 'allowed'
          AND (ppa.category IS NULL OR ppa.category = p.category)
        ))
        OR
        (NOT has_allowed_families AND NOT EXISTS(
          SELECT 1 FROM partner_product_access ppa
          WHERE ppa.partner_id = p_partner_id
          AND ppa.family = p.family
          AND ppa.access = 'denied'
          AND (ppa.category IS NULL OR ppa.category = p.category)
        ))
      )
    )
  );
END;
$$;

-- Function to get category counts filtered by partner access
CREATE OR REPLACE FUNCTION public.get_category_counts_for_partner(p_partner_id uuid)
RETURNS TABLE(family text, category text, product_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.family, p.category, count(*) AS product_count
  FROM products p
  WHERE p.hidden = false
  AND p.id IN (SELECT get_partner_visible_products(p_partner_id))
  GROUP BY p.family, p.category
  ORDER BY p.family, p.category;
$$;
