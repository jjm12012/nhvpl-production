import type { MerchandiseEventInput } from './validations';

// Map a validated merchandise event payload onto Event columns.
// League-specific NOT NULL columns (season, year, dates, price) are filled
// from the order window and unit price so the rest of the app keeps working
// unchanged. Used by the admin create (POST) and update (PUT) routes.
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
    price: validated.unitPrice,
    currency: 'USD',
    unitPrice: validated.unitPrice,
    availableColors: validated.availableColors,
    orderOpenDate: validated.orderOpenDate,
    orderCloseDate: validated.orderCloseDate,
    isActive: validated.isActive,
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
