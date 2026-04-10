

# Clean Up All Sample Data

## Summary
Delete all sample/test data from the platform: 15 products, 4 enquiries, 1 quotation, and related notifications. This leaves the tables empty and ready for real data to be pulled from ModuSys.

## Deletion Order (respects dependencies)
Since there are no foreign keys enforced, order doesn't strictly matter, but logically:

1. **Notifications** — delete all 3 (they reference enquiries/quotations contextually)
2. **Quotations** — delete 1
3. **Enquiries** — delete 4
4. **Products** — delete 15
5. **Partner favourites** — already empty, no action needed
6. **Orders** — already empty, no action needed

## How
Use the Supabase insert tool (which supports DELETE operations) to run:
```sql
DELETE FROM notifications;
DELETE FROM quotations;
DELETE FROM enquiries;
DELETE FROM products;
```

## Result
All tables will be empty. The product catalog on `/portal/products` and `/admin/products` will show empty states. Real products can then be pulled from ModuSys via the stock sync or a new product pull function.

