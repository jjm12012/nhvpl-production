// One-time fold-in: merge the two Fall 2026 merch events (shirt + hoody,
// created separately because the portal only supported one product per
// event) into a single event with two products.
//
// Usage (after the merch_products migration has run and the new code is
// deployed):
//   node prisma/scripts/consolidate-fall-merch.js            # dry run
//   node prisma/scripts/consolidate-fall-merch.js --apply    # do it
//
// The fundraiser line lives on the new event's description (one line for
// the whole event), so product descriptions are left blank.
//
// Idempotent: re-running after a successful apply is a no-op. Everything is
// done in one transaction. Orders already placed on the old events (if any)
// are moved to the new event; their productId is unchanged because the
// products themselves move.

const { PrismaClient } = require('@prisma/client');

const SHIRT_EVENT_ID = 'cmube1oan0000387a9d4s8tgj'; // "Fall League Shirt Order Form"
const HOODY_EVENT_ID = 'cmube4ukq0001387arhnemhcl'; // "Fall League Hoody Order Form"

const NEW_EVENT = {
  name: 'Fall League Merch Order Form',
  description: '$10 from every order goes to our Dink to End Domestic Violence fundraiser!',
};

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const [shirtEvent, hoodyEvent] = await Promise.all([
    prisma.event.findUnique({ where: { id: SHIRT_EVENT_ID }, include: { products: true } }),
    prisma.event.findUnique({ where: { id: HOODY_EVENT_ID }, include: { products: true } }),
  ]);

  const already = await prisma.event.findFirst({
    where: { name: NEW_EVENT.name, formType: 'MERCHANDISE' },
    include: { products: true },
  });
  if (already) {
    console.log(`Already consolidated: event ${already.id} "${already.name}" with products:`);
    for (const p of already.products) console.log(`  - ${p.name} $${p.unitPrice} (${p.id})`);
    return;
  }

  if (!shirtEvent || !hoodyEvent) {
    throw new Error('One of the source events was not found — nothing to do.');
  }
  if (shirtEvent.formType !== 'MERCHANDISE' || hoodyEvent.formType !== 'MERCHANDISE') {
    throw new Error('Source events are not merchandise events.');
  }
  if (shirtEvent.products.length !== 1 || hoodyEvent.products.length !== 1) {
    throw new Error(
      `Expected exactly one backfilled product per source event (shirt: ${shirtEvent.products.length}, hoody: ${hoodyEvent.products.length}). Has the merch_products migration run?`
    );
  }

  const shirtProduct = shirtEvent.products[0];
  const hoodyProduct = hoodyEvent.products[0];

  const orderCounts = await prisma.merchandiseOrder.groupBy({
    by: ['eventId'],
    where: { eventId: { in: [SHIRT_EVENT_ID, HOODY_EVENT_ID] } },
    _count: true,
  });

  // The order window is the union of the two source windows.
  const orderOpenDate = new Date(
    Math.min(shirtEvent.orderOpenDate.getTime(), hoodyEvent.orderOpenDate.getTime())
  );
  const orderCloseDate = new Date(
    Math.max(shirtEvent.orderCloseDate.getTime(), hoodyEvent.orderCloseDate.getTime())
  );

  console.log('Plan:');
  console.log(`  Create event "${NEW_EVENT.name}" (${orderOpenDate.toISOString()} → ${orderCloseDate.toISOString()})`);
  console.log(`  Move product ${shirtProduct.id} → rename "T-Shirt" ($${shirtProduct.unitPrice}, ${shirtProduct.availableColors.length} colors)`);
  console.log(`  Move product ${hoodyProduct.id} → rename "Hoodie"  ($${hoodyProduct.unitPrice}, ${hoodyProduct.availableColors.length} colors)`);
  for (const c of orderCounts) console.log(`  Move ${c._count} order(s) from event ${c.eventId}`);
  console.log(`  Deactivate + rename the two source events with " (merged)"`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to execute.');
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        formType: 'MERCHANDISE',
        name: NEW_EVENT.name,
        description: NEW_EVENT.description,
        season: 'Merch',
        year: orderOpenDate.getFullYear(),
        startDate: orderOpenDate,
        endDate: orderCloseDate,
        registrationOpen: orderOpenDate,
        registrationClose: orderCloseDate,
        price: 0,
        currency: 'USD',
        orderOpenDate,
        orderCloseDate,
        isActive: true,
      },
    });

    await tx.merchProduct.update({
      where: { id: shirtProduct.id },
      data: { eventId: newEvent.id, name: 'T-Shirt', description: null, sortOrder: 0 },
    });
    await tx.merchProduct.update({
      where: { id: hoodyProduct.id },
      data: { eventId: newEvent.id, name: 'Hoodie', description: null, sortOrder: 1 },
    });

    // Keep the productName snapshot in sync with the rename for any orders
    // that were placed before consolidation.
    await tx.merchandiseOrder.updateMany({
      where: { productId: shirtProduct.id },
      data: { eventId: newEvent.id, productName: 'T-Shirt' },
    });
    await tx.merchandiseOrder.updateMany({
      where: { productId: hoodyProduct.id },
      data: { eventId: newEvent.id, productName: 'Hoodie' },
    });

    await tx.event.update({
      where: { id: SHIRT_EVENT_ID },
      data: { isActive: false, name: `${shirtEvent.name} (merged)` },
    });
    await tx.event.update({
      where: { id: HOODY_EVENT_ID },
      data: { isActive: false, name: `${hoodyEvent.name} (merged)` },
    });

    return newEvent;
  });

  console.log(`\nDone. New event id: ${result.id}`);
  console.log(`Public order link: /order/${result.id}`);
  console.log('Next: in admin, open the event and set the Hoodie sizes/fits to match the supplier.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
