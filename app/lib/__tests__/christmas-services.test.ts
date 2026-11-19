import { describe, expect, it } from 'vitest';
import { isChristmasServicesActive } from '../christmas-services';

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
