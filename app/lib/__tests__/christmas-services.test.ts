import { describe, expect, it } from 'vitest';
import {
  christmasServicesUrl,
  isChristmasServicesActive,
} from '../christmas-services';

describe('isChristmasServicesActive', () => {
  it('is active before Christmas Eve 9PM Eastern', () => {
    expect(isChristmasServicesActive(Date.parse('2026-11-19T12:00:00Z'))).toBe(
      true,
    );
    expect(
      isChristmasServicesActive(Date.parse('2026-12-24T20:59:59-05:00')),
    ).toBe(true);
  });

  it('turns off at Christmas Eve 9PM Eastern', () => {
    expect(
      isChristmasServicesActive(Date.parse('2026-12-24T21:00:00-05:00')),
    ).toBe(false);
    expect(isChristmasServicesActive(Date.parse('2026-12-26T12:00:00Z'))).toBe(
      false,
    );
  });
});

describe('christmasServicesUrl', () => {
  it('links straight to the campus service times', () => {
    expect(christmasServicesUrl('palm-beach-gardens')).toBe(
      'https://www.christmasatcf.com/?view=service&campus=palm-beach-gardens',
    );
  });

  it('maps Español campuses to the Spanish page and their Christmas ids', () => {
    expect(christmasServicesUrl('iglesia-royal-palm-beach')).toBe(
      'https://www.christmasatcf.com/espanol?view=service&campus=espanol-royal-palm-beach',
    );
  });

  it('maps CF Everywhere to the online campus', () => {
    expect(christmasServicesUrl('cf-everywhere')).toBe(
      'https://www.christmasatcf.com/?view=service&campus=online',
    );
  });
});
