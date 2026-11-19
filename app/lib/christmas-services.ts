// Christmas 2026 banner on campus pages. Ends Dec 24, 9PM Eastern (EST is UTC-5).
const CHRISTMAS_SERVICES_END = Date.parse('2026-12-25T02:00:00Z');

const CHRISTMAS_SITE = 'https://www.christmasatcf.com';

// Our campus slugs that differ from christmasatcf.com's campus ids.
const CHRISTMAS_CAMPUS_IDS: Record<string, string> = {
  'iglesia-palm-beach-gardens': 'espanol-palm-beach-gardens',
  'iglesia-royal-palm-beach': 'espanol-royal-palm-beach',
  'cf-everywhere': 'online',
};

export const isChristmasServicesActive = (now: number = Date.now()) =>
  now < CHRISTMAS_SERVICES_END;

/** Deep link to the campus's service times; Español campuses use the Spanish page. */
export const christmasServicesUrl = (campusUrl: string) => {
  const campus = CHRISTMAS_CAMPUS_IDS[campusUrl] ?? campusUrl;
  const path = campusUrl.startsWith('iglesia-') ? '/espanol' : '/';
  const params = new URLSearchParams({ view: 'service', campus });
  return `${CHRISTMAS_SITE}${path}?${params}`;
};
