import type { EventBrief, ToolResult } from '../domain.ts';

/** Deterministic workshop catalog. Replace this adapter with real vendor APIs later. */
export function searchVenues(brief: EventBrief): ToolResult[] {
  const venues = [
    { name: 'Community Celebration Hall', capacity: 50, indoor: true, basePrice: 15_000, location: brief.city },
    { name: 'Neighbourhood Studio', capacity: 45, indoor: true, basePrice: 11_000, location: brief.city },
  ];

  return venues.map((venue) => ({
    tool: 'venue_catalog.search',
    result: `${venue.name}: up to ${venue.capacity} guests, ${venue.indoor ? 'indoor' : 'outdoor'}, ${venue.location}`,
    data: {
      name: venue.name,
      capacity: venue.capacity,
      indoor: venue.indoor,
      basePrice: venue.basePrice,
      location: venue.location,
      fitsGuestCount: brief.guestCount <= venue.capacity,
      matchesSetting: brief.setting === 'Indoor' ? venue.indoor : !venue.indoor,
    },
  }));
}

export function searchVendors(): ToolResult[] {
  return [
    {
      tool: 'vendor_catalog.catering',
      result: 'Family buffet packages: ₹650 per guest (premium) or ₹525 per guest (standard).',
      data: { premiumPerGuest: 650, standardPerGuest: 525, vegetarianOptions: true },
    },
    {
      tool: 'vendor_catalog.decor',
      result: 'Decor packages range from ₹4,250 (themed) to ₹3,500 (simple family package).',
      data: { themed: 4_250, simple: 3_500 },
    },
    {
      tool: 'vendor_catalog.extras',
      result: 'Cake, games and photo extras are optional and can be scaled to budget.',
      data: { cake: 2_500, games: 2_500, photoExtras: 217 },
    },
  ];
}

export function collectToolResults(brief: EventBrief): ToolResult[] {
  return [...searchVenues(brief), ...searchVendors()];
}
