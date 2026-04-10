ALTER TABLE products
  ADD COLUMN IF NOT EXISTS modusys_product_id uuid,
  ADD COLUMN IF NOT EXISTS modusys_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS products_modusys_product_id_idx
  ON products(modusys_product_id)
  WHERE modusys_product_id IS NOT NULL;