ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_url text;

DROP VIEW IF EXISTS public.products_partner_view;

CREATE VIEW public.products_partner_view AS
SELECT id, sku, name, description, category, family, list_price_usd, stock_qty, hidden, product_url, created_at, updated_at
FROM public.products
WHERE hidden = false;