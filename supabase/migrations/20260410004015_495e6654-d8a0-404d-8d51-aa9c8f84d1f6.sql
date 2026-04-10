-- Drop the partial unique index
DROP INDEX IF EXISTS products_modusys_product_id_idx;

-- Create a proper unique constraint (required for Supabase upsert onConflict)
ALTER TABLE products
  ADD CONSTRAINT products_modusys_product_id_key
  UNIQUE (modusys_product_id);