// Christmas 2026 banner on campus pages. Ends Dec 24, 9PM Eastern (EST is UTC-5).
const CHRISTMAS_SERVICES_END = Date.parse('2026-12-25T02:00:00Z');

export const CHRISTMAS_SERVICES_URL = 'https://www.christmasatcf.com/';
export const CHRISTMAS_SERVICES_URL_ES = 'https://navidadencf.com/';

export const isChristmasServicesActive = (now: number = Date.now()) =>
  now < CHRISTMAS_SERVICES_END;
