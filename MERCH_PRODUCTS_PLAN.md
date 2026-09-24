# Merch Orders — Products per Event (Change Plan)

Reviewed against the current codebase and the live database on 2026-09-24. **No code has been changed yet — this is the plan for sign-off.**

## What prompted this

An admin created two merch events for the fall order — **"Fall League Shirt Order Form"** ($25, 13 colors) and **"Fall League Hoody Order Form"** ($35, 5 colors). Both are active with an order window of **Sep 21 – Oct 5** and have **0 orders** as of this review. The Summer 2026 T-Shirt event (67 paid orders) is inactive and unaffected.

She had no other option: the portal's model is **one event = one product**. A `MERCHANDISE` event carries one `unitPrice` and one color list, and sizes/fits are hardcoded shirt constants. There is no notion of a "product," so hoodies could only exist as a second event.

### What breaks with two events

| Symptom | Where |
|---|---|
| Buyer wanting a shirt *and* a hoodie pays twice (form text literally says "submit again") | `order/[eventId]/page.tsx` |
| Homepage hero button is hardcoded **"Order T-Shirts"** and links only to the first event by close date — hoodies only reachable from the lower "League Merch" cards | `app/page.tsx` |
| Every buyer-facing string says "shirt": "per shirt", "Shirt Size", "Your shirt order is confirmed! 🎽", "New shirt order", "Order more shirts" | order form, `email.ts`, success page |
| Hoodies are forced into the shirt size range **and** a *required* Men's/Women's fit — wrong if the hoodies are unisex | `validations.ts` (`SHIRT_SIZES`, `SHIRT_FITS`) |
| Two CSVs to reconcile for one supplier order; admin list shows two "Merch" rows for one campaign | `merch-csv/route.ts`, admin events page |

## Decisions locked

- **Scope: Option B — products inside a merch event.** One event ("Fall League Merch Order Form") holds N products (T-Shirt, Hoodie, …), each with its own price, colors, sizes, and whether fit is asked. Buyer picks product → fit/size/color → quantity. **Still one product per checkout** (a cart is Option C, deferred — see "Path to a cart" below; the schema here is designed so C is an addition, not a rewrite).
- **Migrate existing data.** A one-time script folds the two live fall events into one event with two products. The summer event gets a single backfilled product and is otherwise untouched.
- **Per-product sizes and fit toggle are part of B** (they're what makes hoodies representable), entered as simple comma-separated lists like colors are today. No product images, no pickup notes.

---

## 1. Data model

### New table: `MerchProduct`

```prisma
model MerchProduct {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name            String                              // "T-Shirt", "Hoodie"
  description     String?
  unitPrice       Decimal  @db.Decimal(10, 2)
  availableColors String[] @default([])
  sizes           String[] @default([])               // e.g. XS..4XL; admin-editable per product
  fits            String[] @default([])               // e.g. ["Men's","Women's"]; EMPTY = fit not asked
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)             // hide a product without deleting it
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  orders          MerchandiseOrder[]

  @@index([eventId])
}
```

### `MerchandiseOrder` changes

- Add `productId String` + relation to `MerchProduct` (`onDelete: Restrict` — a product with orders cannot be deleted, only deactivated).
- Add `productName String` — a snapshot at purchase time so emails/CSV don't change if a product is later renamed.
- `fit` stays nullable (already is) — it's simply null for products with no fits.
- Everything else (size, color, quantity, unitPrice, totalAmount, Stripe ids) unchanged.

### `Event` changes

- `formType`, `orderOpenDate`, `orderCloseDate`, `merchandiseOrders` stay.
- `unitPrice` and `availableColors` on Event become **unused** for merch after migration. Recommend keeping the columns this release (marked deprecated in the schema comment) and dropping them in a small follow-up migration once the new flow is verified. Nothing reads them after this change.
- `merchEventData()` currently fills the league NOT NULL `price` column from unitPrice; it will fill `price = 0` for merch events (the column is meaningless for merch and nothing displays it).

### Migration (one SQL migration, single transaction) — `prisma/migrations/2026XXXX_merch_products/`

1. `CREATE TABLE "MerchProduct"` + index + FK.
2. **Backfill one product per existing MERCHANDISE event** from the event's own `unitPrice`/`availableColors`, with `sizes` = the current shirt list and `fits` = `["Men's","Women's"]`, `name` = "T-Shirt" (all three existing events are shirt/hoody forms; the fold-in script renames the hoody one).
3. `ALTER TABLE "MerchandiseOrder" ADD COLUMN "productId" TEXT, ADD COLUMN "productName" TEXT;`
4. `UPDATE "MerchandiseOrder"` → set `productId`/`productName` from the event's backfilled product (covers all 67 summer orders + any fall orders that land before deploy).
5. `SET NOT NULL` on both, add FK (`ON DELETE RESTRICT`) and index.

Because every existing merch event gets exactly one product, this migration is safe to run **before** the code deploy — old code ignores the new table and columns.

### Fold-in script (one-time, `prisma/scripts/consolidate-fall-merch.ts`, run after deploy)

Idempotent; takes the two event ids as arguments. Wrapped in a transaction:

1. Create event **"Fall League Merch Order Form"** (`formType=MERCHANDISE`, window Sep 21 – Oct 5 23:59, active, description from the shirt event — see open question).
2. Re-point the two backfilled products to the new event; rename to **"T-Shirt"** ($25, the 13 colors, shirt sizes, Men's/Women's) and **"Hoodie"** ($35, the 5 colors, sizes/fits per open questions); set `sortOrder` 0 and 1.
3. `UPDATE "MerchandiseOrder" SET eventId = <new>` for any orders on the two old events (currently none, but safe if some arrive before cutover).
4. Set the two old events `isActive = false` and rename them with a "(merged)" suffix so they're recognizable in admin.

The summer event is not touched by this script.

---

## 2. Admin: create/edit a merch event with products

**`src/lib/validations.ts`**
- New `merchProductSchema`: `id?` (present on update), `name`, `description?`, `unitPrice` (positive), `availableColors` (CSV → string[], ≥1), `sizes` (CSV → string[], ≥1), `fits` (CSV → string[], may be empty), `sortOrder`, `isActive`.
- `merchandiseEventSchema`: **remove** `unitPrice`/`availableColors`; **add** `products: z.array(merchProductSchema).min(1)`.
- Keep `SHIRT_SIZES` and `SHIRT_FITS` as the **defaults** prefilled into a new product row; they are no longer validation enums.
- `merchandiseOrderSchema`: add `productId`; `size`/`fit` become plain strings (validated server-side against the product); `fit` optional.

**`src/components/EventModal.tsx`** — merch section becomes: Name, Description, Order Open/Close, Active, and a **Products** list:
- Each row: Name, Price, Colors (CSV), Sizes (CSV, prefilled XS–4XL), Fits (CSV, prefilled Men's/Women's; helper text "leave blank if this item has one cut"), Active checkbox, Remove.
- "Add product" appends a row with the defaults. Minimum one product to save.
- Remove on a saved product that has orders → the API returns 409; the modal shows "This product has orders — uncheck Active to hide it instead."

**`src/app/api/admin/events/route.ts` (POST)** and **`[id]/route.ts` (PUT)**
- POST: `prisma.event.create({ data: { ...merchEventData(v), products: { create: [...] } } })`.
- PUT: in a transaction — update event; upsert products by id; delete products that were removed **only if** they have zero orders (else 409).
- GET (list): `_count.merchandiseOrders` already sums across the event, so the count keeps working; also include `products` so the modal can edit them.

**`src/lib/merch.ts`** — `merchEventData()` drops `unitPrice`/`availableColors`, sets `price: 0`.

**`src/app/admin/events/page.tsx`** — under the "Merch" badge, show the product count ("2 products"). No other change; CSV download button stays per event.

---

## 3. Public order form

**`src/app/api/order/[eventId]/route.ts`** — response gains `products: [{ id, name, description, unitPrice, availableColors, sizes, fits, sortOrder }]` (active only, sorted). Drops event-level `unitPrice`/`availableColors`.

**`src/app/order/[eventId]/page.tsx`**
- Header: event name + description; price line removed (it's per product now).
- **Product picker** at the top of the form: one radio card per product showing name, price, and description. If the event has exactly one product it's preselected and the picker is still shown (so the buyer sees what they're buying).
- Fit dropdown renders **only if** the selected product has `fits.length > 0`.
- Size and Color dropdowns are driven by the selected product's lists. Changing product resets fit/size/color.
- Total = selected product's price × quantity.
- Copy: "Shirt Size" → "Size", "Shirt Color" → "Color"; helper text → "Want another item, or a different size or color? Submit the form again after checkout."

**`src/app/api/order/checkout/route.ts`**
- Load the product (`productId`, must belong to `eventId`, must be active). Validate `color ∈ availableColors`, `size ∈ sizes`, and `fit ∈ fits` when fits is non-empty (reject a fit when fits is empty).
- Unit price comes from the **product**.
- Stripe line item name: `` `${product.name} — ${[fit, color, size].filter(Boolean).join(' / ')}` `` (e.g. "Hoodie — Jet Black / L").
- Metadata adds `product_id` and `product_name`; `fit` omitted when not applicable.

**`src/lib/merch-orders.ts`** — read `product_id`/`product_name` from metadata, write `productId`/`productName`; `fit` no longer required in the presence guard.

---

## 4. Confirmation, emails, success page, CSV

- **`src/app/api/order/confirm/route.ts`** — add `productName` to the response.
- **`src/app/order/[eventId]/success/page.tsx`** — add a "Item" row; "Order more shirts" → "Order more merch".
- **`src/lib/email.ts`** — add an "Item" row above Fit; subjects → "Your NHVPL merch order is confirmed! 🎽" and "New merch order — {name}"; heading "New merch order received".
- **`src/app/api/admin/export/merch-csv/route.ts`** — add a **Product** column after Email (uses the `productName` snapshot). One CSV per event = one file for the whole fall order, with Product × Fit × Size × Color tallied by the supplier sheet.

## 5. Homepage

**`src/app/page.tsx`**
- Hero button: "Order T-Shirts" → **"Order Merch"** (still links to the first open merch event — after consolidation there is only one).
- `getOpenMerchEvents()` selects `products` (active) instead of `unitPrice`; each card lists its products with prices (e.g. "T-Shirt · $25 / Hoodie · $35") or "From $25" if you prefer a single line. Card button "Order Now" unchanged.

## 6. Not changing

- Stripe flow, webhook, idempotency (`stripeSessionId` unique), and the double-writer guard — product just rides along in metadata like fit does.
- League registration side of the app.
- Admin login, content blocks, stats.

---

## Path to a cart (Option C, later)

`MerchandiseOrder` today is one line = one order. When a cart is wanted: add `MerchandiseOrderItem` (productId, productName, fit, size, color, quantity, unitPrice, lineTotal) and move those columns off `MerchandiseOrder`, which becomes the order header (buyer, Stripe ids, total). Because B already keys everything by `productId` and snapshots `productName`, that move is a column relocation plus a checkout that stores the pending cart server-side before creating the Stripe session (metadata is capped at 500 chars/value, so line items can't ride in metadata the way a single line does today).

## Suggested build order

1. Schema + migration (table, backfill, order columns) — run against a dev database first, then production **before** the deploy (safe with old code).
2. Validations + `merchEventData`.
3. Admin routes (nested create/upsert/delete-with-409) + EventModal products editor.
4. Public event API + order form (product picker, dependent dropdowns).
5. Checkout route + `merch-orders.ts` (product validation, metadata).
6. Confirm route, success page, emails, CSV.
7. Homepage copy + cards.
8. Fold-in script.
9. Verify end-to-end (below).

**Estimate:** 2–3 working days including testing.

## Rollout (the window is live)

- **Now:** leave both fall events as they are. They work; they're just clunky. No admin action needed before cutover.
- **Build** on `feature/merch-products`; test in Stripe test mode with a test event holding two products (one with fits, one without).
- **Cutover, in this order:** run migration → deploy → run fold-in script → open `/order/<newEventId>` and place one test order per product (refund after) → check the buyer + admin emails and the CSV show Product → check the homepage shows one "Order Merch" card with both prices → tell the admin the new link.
- **Target:** cutover by **Mon Sep 29** so buyers have a full week before the **Oct 5** close. If it slips, the fallback is simply letting the two events run to Oct 5 and consolidating afterward — nothing is lost, and the migration + script handle that case identically.

## Verification checklist

- Migration on a copy of prod: 3 products created; all 67 summer orders have `productId`/`productName`; `SET NOT NULL` succeeds.
- Admin: create event with 2 products; edit prices/colors; remove a product with no orders (ok); try to remove one with orders (409 + message); deactivate instead.
- Order form: product switch resets dependent fields; fit hidden for a no-fit product; server rejects a size/color/fit not on the product (curl the API directly).
- Stripe: line item label correct; metadata has `product_id`; webhook and success-page both record exactly one row; emails sent once.
- CSV: Product column populated for old and new orders.
- Homepage: one merch card, both products/prices listed, hero says "Order Merch".

## Open questions before building

1. **Hoodie fit:** are the hoodies unisex (fits blank) or Men's/Women's? And are hoodie sizes S–3XL, or the full XS–4XL? (Can confirm with the admin — she'll know from the supplier catalog.)
2. **Consolidated event description:** the two events have slightly different fundraiser text ("$10 from each shirt order…" vs "$10 from every order…"). Proposed: "$10 from every order goes to our Dink to End Domestic Violence fundraiser!" — one line for the whole event.
3. **Homepage card price line:** list every product with its price, or "From $25"? (Proposed: list them — two lines is fine.)
4. **Drop `Event.unitPrice` / `Event.availableColors` now or later?** Proposed: later, in a follow-up migration after the fall order closes.
