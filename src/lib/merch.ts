import type { MerchandiseEventInput, MerchProductInput } from './validations';

// Map a validated merchandise event payload onto Event columns (products are
// written separately by the admin routes). League-specific NOT NULL columns
// (season, year, dates, price) are filled from the order window so the rest
// of the app keeps working unchanged; `price` is meaningless for merch (each
// product has its own) and is set to 0. Event.unitPrice/availableColors are
// deprecated and intentionally not written.
export function merchEventData(validated: MerchandiseEventInput) {
  return {
    formType: 'MERCHANDISE' as const,
    name: validated.name,
    description: validated.description,
    season: 'Merch',
    year: validated.orderOpenDate.getFullYear(),
    startDate: validated.orderOpenDate,
    endDate: validated.orderCloseDate,
    registrationOpen: validated.orderOpenDate,
    registrationClose: validated.orderCloseDate,
    price: 0,
    currency: 'USD',
    orderOpenDate: validated.orderOpenDate,
    orderCloseDate: validated.orderCloseDate,
    isActive: validated.isActive,
  };
}

// Columns of MerchProduct that come from the admin form.
export function merchProductData(p: MerchProductInput, index: number) {
  return {
    name: p.name,
    description: p.description || null,
    unitPrice: p.unitPrice,
    availableColors: p.availableColors,
    sizes: p.sizes,
    fits: p.fits,
    sortOrder: index,
    isActive: p.isActive,
  };
}

// Shape of a product as exposed to the public order form / homepage.
export function publicProduct(p: {
  id: string;
  name: string;
  description: string | null;
  unitPrice: { toString(): string } | number;
  availableColors: string[];
  sizes: string[];
  fits: string[];
  sortOrder: number;
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    unitPrice: Number(p.unitPrice),
    availableColors: p.availableColors,
    sizes: p.sizes,
    fits: p.fits,
    sortOrder: p.sortOrder,
  };
}

// True when the merch order window is currently open.
export function isOrderWindowOpen(event: {
  isActive: boolean;
  orderOpenDate: Date | null;
  orderCloseDate: Date | null;
}): boolean {
  if (!event.isActive || !event.orderOpenDate || !event.orderCloseDate) {
    return false;
  }
  const now = new Date();
  return now >= event.orderOpenDate && now <= event.orderCloseDate;
}
