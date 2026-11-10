import type { EventBrief, EventPlan, PlanItem } from '../domain.ts';
import { POLICY } from '../harness/policies.ts';

type PackageLevel = 'initial' | 'revision-one' | 'standard' | 'lean';

function itemsFor(brief: EventBrief, packageLevel: PackageLevel): PlanItem[] {
  const guests = brief.guestCount;
  const packages: Record<PackageLevel, Omit<PlanItem, 'amount'>[]> = {
    initial: [
      { id: 'venue', category: 'Venue', label: 'Community Celebration Hall — premium slot', rationale: 'Prime-time hall booking with a premium setup.' },
      { id: 'catering', category: 'Catering', label: 'Full family buffet — ₹650 per guest', rationale: 'Broad menu with vegetarian options.' },
      { id: 'decor', category: 'Decor', label: 'Themed decoration package', rationale: 'More elaborate theme and table styling.' },
      { id: 'cake', category: 'Cake', label: 'Celebration cake', rationale: 'Standard event cake.' },
      { id: 'entertainment', category: 'Entertainment', label: 'Hosted games and entertainment', rationale: 'Dedicated host and activity setup.' },
      { id: 'extras', category: 'Extras', label: 'Photo and party extras', rationale: 'Optional prints and add-ons.' },
    ],
    'revision-one': [
      { id: 'venue', category: 'Venue', label: 'Community Celebration Hall — adjusted slot', rationale: 'Move to a less expensive slot.' },
      { id: 'catering', category: 'Catering', label: 'Standard buffet — ₹550 per guest', rationale: 'Retain a balanced menu with a simpler selection.' },
      { id: 'decor', category: 'Decor', label: 'Simple themed decor', rationale: 'Reduce the number of decorative elements.' },
      { id: 'cake', category: 'Cake', label: 'Celebration cake', rationale: 'Keep the core celebration requirement.' },
      { id: 'entertainment', category: 'Entertainment', label: 'Compact hosted games', rationale: 'Shorter entertainment slot.' },
      { id: 'extras', category: 'Extras', label: 'Basic photo extras', rationale: 'Remove premium add-ons.' },
    ],
    standard: [
      { id: 'venue', category: 'Venue', label: 'Community Celebration Hall — standard slot', rationale: 'Choose the standard package while retaining the indoor venue.' },
      { id: 'catering', category: 'Catering', label: 'Family buffet — ₹525 per guest', rationale: 'Retain vegetarian choices with a streamlined menu.' },
      { id: 'decor', category: 'Decor', label: 'Simple family decor', rationale: 'Keep the key theme without premium styling.' },
      { id: 'cake', category: 'Cake', label: 'Celebration cake', rationale: 'Keep the core celebration requirement.' },
      { id: 'entertainment', category: 'Entertainment', label: 'DIY family games', rationale: 'Use a simple self-hosted activity plan.' },
      { id: 'extras', category: 'Extras', label: 'Minimal photo extras', rationale: 'Keep only essential extras.' },
    ],
    lean: [
      { id: 'venue', category: 'Venue', label: 'Neighbourhood Studio — community slot', rationale: 'Use the lower-cost indoor venue package.' },
      { id: 'catering', category: 'Catering', label: 'Value buffet — ₹475 per guest', rationale: 'Simplify the menu while retaining vegetarian options.' },
      { id: 'decor', category: 'Decor', label: 'Minimal decor', rationale: 'Reuse venue styling and reduce custom decor.' },
      { id: 'cake', category: 'Cake', label: 'Compact celebration cake', rationale: 'Reduce cake size to match the guest count.' },
      { id: 'entertainment', category: 'Entertainment', label: 'Family activity pack', rationale: 'Use simple games instead of a hosted package.' },
      { id: 'extras', category: 'Extras', label: 'Essential photo extras', rationale: 'Remove non-essential add-ons.' },
    ],
  };

  const amounts: Record<PackageLevel, number[]> = {
    initial: [15_000, 650 * guests, 4_250, 2_500, 4_500, 995],
    'revision-one': [12_000, 550 * guests, 3_500, 2_500, 3_500, 1_500],
    standard: [11_000, 525 * guests, 3_500, 2_500, 2_500, 216],
    lean: [9_000, 475 * guests, 3_000, 2_200, 4_000, 1_000],
  };
  return packages[packageLevel].map((item, index) => ({ ...item, amount: amounts[packageLevel][index] }));
}

export function buildPlan(brief: EventBrief, packageLevel: PackageLevel, version: number): EventPlan {
  const items = itemsFor(brief, packageLevel);
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.round(subtotal * POLICY.taxRate);
  const contingency = Math.round(subtotal * POLICY.contingencyRate);
  const venueCapacity = packageLevel === 'lean' ? 45 : 50;
  const venueName = packageLevel === 'lean' ? 'Neighbourhood Studio' : 'Community Celebration Hall';
  const labels: Record<PackageLevel, string> = {
    initial: 'Initial premium proposal',
    'revision-one': 'Revision 1 — reduced scope',
    standard: 'Standard optimised package',
    lean: 'Lean package',
  };
  return {
    brief,
    venueName,
    venueCapacity,
    venueSetting: 'Indoor',
    items,
    subtotal,
    tax,
    contingency,
    total: subtotal + tax + contingency,
    currency: 'INR',
    version,
    optimizationLabel: labels[packageLevel],
  };
}
