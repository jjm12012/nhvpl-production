# Shirt Order Form — Change Plan

Based on the ordering feedback (fit/style, full size range, color list). Reviewed against the current codebase. **No code has been changed yet — this is the plan for sign-off.**

## Decisions locked

- **Fit/style:** a *separate* "Fit" dropdown on the order form with **Men's** and **Women's** (own field, not folded into color).
- **Sizes:** add **4XL** to the existing range (XS–3XL today).
- **Colors:** stay **admin-editable per event**. The five colors (Kelly Green, True Royal, Iron Grey Heather, Black, True Navy) get typed into the event — no code change for colors.

## Summary of the three items

| Item | Status today | Work needed |
|------|--------------|-------------|
| Fit (Men's/Women's) | Does **not** exist anywhere | New field end-to-end + small DB migration |
| Sizes | `XS, S, M, L, XL, 2XL, 3XL` hardcoded | Add `4XL` (one line) |
| Colors | Admin-editable list per event already works | Just enter the 5 colors in admin (operational, no code) |

---

## 1. Fit/style — new field (the bulk of the work)

Fit is a genuine new attribute (same color, different cut), so it becomes its own field on the order. This touches the full path from form → payment → database → email → export.

**Files to change:**

1. **`prisma/schema.prisma`** — add a `fit` column to `MerchandiseOrder`. Recommend **nullable** (`fit String?`) so existing paid orders aren't broken by the migration; the form will require it for all new orders. Run a Prisma migration against Supabase.
2. **`src/lib/validations.ts`** — add `SHIRT_FITS = ["Men's", "Women's"]` and a required `fit` field on `merchandiseOrderSchema`.
3. **`src/app/order/[eventId]/page.tsx`** — add a required Fit dropdown next to Size/Color.
4. **`src/app/api/order/checkout/route.ts`** — include `fit` in the Stripe session metadata and in the line-item label (e.g. `Event - Men's / Black / L`).
5. **`src/lib/merch-orders.ts`** — read `fit` from the Stripe metadata and write it on the order row (and add it to the metadata-present guard).
6. **`src/lib/email.ts`** — add a "Fit" row to the buyer + admin order-confirmation email.
7. **`src/app/api/order/confirm/route.ts`** — include `fit` in the confirmed-order response.
8. **`src/app/order/[eventId]/success/page.tsx`** — show "Fit" on the confirmation screen.
9. **`src/app/api/admin/export/merch-csv/route.ts`** — add a **Fit** column to the CSV so you can tally fit × size × color for the supplier.

**Migration note:** adding the column to the live Supabase DB is a one-time deploy step. Making it nullable means no backfill is required; older orders simply show blank fit.

## 2. Sizes — add 4XL

- **`src/lib/validations.ts`** — append `"4XL"` to `SHIRT_SIZES`.

That's the only change. The order form maps over `SHIRT_SIZES`, and size is stored as free text, so no migration and no other files are affected.

## 3. Colors — operational only

No code change. When creating/editing the merch event in admin, enter the color box as:

```
Kelly Green, True Royal, Iron Grey Heather, Black, True Navy
```

These flow straight into the order form's color dropdown. (If you ever want them locked in code like sizes are, that's a separate small change — not planned here per your decision to keep them editable.)

---

## Suggested build order

1. Schema: add `fit` column + migration (nullable).
2. Validations: `SHIRT_FITS`, add `fit` to order schema, add `4XL` to sizes.
3. Order form UI: Fit dropdown.
4. Checkout route: fit in metadata + label.
5. Recorder + email + confirm route + success page: carry fit through.
6. CSV export: Fit column.
7. Verify end-to-end: a test order in each fit, confirm DB row, email, and CSV all show fit; confirm 4XL is selectable; confirm the 5 colors render.

## Open question before building

- **"Order more shirts" helper text:** the form currently says *"Want more shirts in a different size or color? Just submit again."* Want me to update that to mention fit too? (Trivial, just confirming.)

## What does NOT need to change

- Colors mechanism (already admin-editable).
- Payment/Stripe flow, idempotency, and webhook logic (fit just rides along in metadata).
- League registration side of the app (untouched).
