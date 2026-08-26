CREATE OR REPLACE FUNCTION public.get_partner_visible_products(p_partner_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_rules boolean;
  has_allowed_families boolean;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.get_category_counts_for_partner(p_partner_id uuid)
RETURNS TABLE(family text, category text, product_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT p.family, p.category, count(*)::bigint AS product_count
  FROM products p
  WHERE p.hidden = false
  AND p.id IN (SELECT public.get_partner_visible_products(p_partner_id))
  GROUP BY p.family, p.category
  ORDER BY p.family, p.category;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_partner_visible_products(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_category_counts_for_partner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_visible_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_counts_for_partner(uuid) TO authenticated;