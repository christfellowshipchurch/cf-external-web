/**
 * Canonical pill order for the ministries finder.
 *
 * The other hubs get facet ordering from Algolia. Ministries filter client-side
 * over a small Rock list, so the designed order lives here instead. Categories
 * present in the data but missing from this list still render, appended after.
 */
export const MINISTRY_CATEGORY_ORDER = [
  'Life Stages',
  'Family & Relationships',
  'Care & Recovery',
  'Growth & Leadership',
  'Serve & Give',
] as const;

/** Query param that makes the active category deep-linkable, like the other finders. */
export const MINISTRY_CATEGORY_PARAM = 'category';
