import { describe, expect, it } from 'vitest';
import { campusPastorRoleLabel, usesSingularCampusPastorLabel } from '../util';

describe('campus pastor role label', () => {
  it('uses the singular label only for Trinity and Online, which are led by one pastor', () => {
    expect(usesSingularCampusPastorLabel('trinity')).toBe(true);
    expect(usesSingularCampusPastorLabel('cf-everywhere')).toBe(true);
    expect(usesSingularCampusPastorLabel('palm-beach-gardens')).toBe(false);
    expect(usesSingularCampusPastorLabel('iglesia-palm-beach-gardens')).toBe(
      false,
    );
    expect(usesSingularCampusPastorLabel(undefined)).toBe(false);
  });

  it('renders English and Spanish labels with the same singular/plural rule', () => {
    expect(campusPastorRoleLabel('jupiter')).toBe('Campus Pastors');
    expect(campusPastorRoleLabel('jupiter', true)).toBe('Pastores del Campus');

    expect(campusPastorRoleLabel('trinity')).toBe('Campus Pastor');
    expect(campusPastorRoleLabel('trinity', true)).toBe('Pastor del Campus');

    expect(campusPastorRoleLabel('cf-everywhere')).toBe('Campus Pastor');
    expect(campusPastorRoleLabel('cf-everywhere', true)).toBe(
      'Pastor del Campus',
    );
  });
});
