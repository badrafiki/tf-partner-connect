# Stop automatic price change notifications

Partners currently get a notification every time a product's price changes in the catalogue (which fires on every ERP product sync). This removes that behaviour and clears the existing price notifications.

## What changes

1. Remove the automatic price-change notification: drop the database trigger on the products table that creates a "Price update: ..." notification, and drop its function.
2. Delete all existing price-change notification records so the bell and dashboard history no longer show them.
3. Leave the notification UI itself in place, and keep stock updates and quotation notifications working as they are.

The price-change icon mapping in the portal UI can stay harmlessly, but I'll remove it from the notification icon lists since no records of that type will exist any more.

## Technical detail

- Migration: `drop trigger on_product_price_change on products;` and `drop function public.notify_price_change();`
- Data cleanup: `delete from notifications where type = 'price_change';`
- Frontend: remove the `price_change` entry from the icon maps in `src/components/layouts/PartnerLayout.tsx` and `src/pages/portal/PortalDashboard.tsx` (both fall back to the general bell icon).
- Basket price-change validation is unrelated and stays: partners still get warned at checkout if a basket item's price moved.
