import { describe, expect, it } from 'vitest';
import { buildRelatedGroupsFilters } from '../related-groups.partial';

describe('buildRelatedGroupsFilters', () => {
  it('matches Watch Party groups only on the Watch Party topic', () => {
    expect(
      buildRelatedGroupsFilters(['Bible Study', 'Watch Party'], 'English'),
    ).toBe('topics:"Watch Party"');
    expect(buildRelatedGroupsFilters(['Watch Party'], 'Spanish')).toBe(
      'topics:"Watch Party"',
    );
  });

  it('matches other groups on first topic and language', () => {
    expect(
      buildRelatedGroupsFilters(['Bible Study', 'Prayer'], 'English'),
    ).toBe('topics:"Bible Study" AND language:"English"');
  });

  it('falls back to topic only, or no filter, when values are missing', () => {
    expect(buildRelatedGroupsFilters(['Prayer'], '')).toBe('topics:"Prayer"');
    expect(buildRelatedGroupsFilters([], '')).toBeUndefined();
  });
});
