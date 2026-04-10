

## Plan: Update "Out of stock" label to "Stock Due Imminently"

### Change
In `src/pages/portal/PortalProducts.tsx`, update the `getStockStatus` function:

**Line 20** — Change `"Out of stock"` to `"Stock due imminently"` and soften the color from red to amber/blue to avoid alarming the customer:

```tsx
if (q === 0) return { label: "Stock due imminently", color: "text-amber-600", dot: "bg-amber-500" };
```

This keeps the visual indicator but uses reassuring language. No other files reference this label.

### Files to edit
- `src/pages/portal/PortalProducts.tsx` — 1 line change

