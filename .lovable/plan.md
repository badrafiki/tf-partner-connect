

# Product Details & Website Link

## Summary
Add a product detail drawer that opens when a partner clicks on a product card, showing full product information (description, specs, stock, pricing). Include a "View on TF USA website" link that opens the product's page on the main TF USA site.

## What changes

### 1. Database: Add `product_url` column to `products` table
- Add a nullable `text` column `product_url` to store the TF USA website link for each product
- Update the `products_partner_view` to include `product_url`
- The sync-products Edge Function can populate this field from ModuSys, or admins can set it manually

### 2. New component: `ProductDetailDrawer.tsx`
A drawer/dialog that shows when a partner clicks a product card. Contents:
- Product name, SKU, family, category
- Full description text (from the existing `description` column)
- Stock status
- List price → partner price with savings
- "View on TF USA website" button (opens `product_url` in new tab, hidden if no URL set)
- "Add to basket" controls (same quantity picker as the card)

### 3. Update `PortalProducts.tsx`
- Add click handler on each product card to open the detail drawer
- Pass selected product data to the drawer
- Keep existing "Add to basket" button on the card (drawer is an additional way to interact)

### 4. Update `AdminProducts.tsx`
- Add an editable `product_url` field so admins can manually set/update the website link for any product

### 5. Update `sync-products` Edge Function
- Accept optional `product_url` field in the incoming product payload so it can be synced from ModuSys

## Technical details
- Migration: `ALTER TABLE products ADD COLUMN product_url text; CREATE OR REPLACE VIEW products_partner_view AS SELECT id, sku, name, description, category, family, list_price_usd, stock_qty, hidden, product_url, created_at, updated_at FROM products WHERE hidden = false;`
- The drawer uses the existing shadcn Drawer component
- No new RLS policies needed — the column inherits existing product policies

