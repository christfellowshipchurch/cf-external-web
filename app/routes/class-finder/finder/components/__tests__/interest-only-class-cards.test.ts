import { describe, expect, it } from 'vitest';

import type { ClassHitType } from '../../../types';
import {
  buildInterestOnlyClassHits,
  type RockClassDefinedValue,
  withInterestOnlyClassHits,
} from '../interest-only-class-cards';

function makeRockClass(
  attrs: Record<string, string>,
  overrides: Partial<RockClassDefinedValue> = {},
): RockClassDefinedValue {
  return {
    value: 'Financial Peace',
    description: 'Get out of debt.',
    attributeValues: Object.fromEntries(
      Object.entries(attrs).map(([key, value]) => [
        key,
        { value, valueFormatted: value },
      ]),
    ),
    ...overrides,
  } as unknown as RockClassDefinedValue;
}

function makeHit(
  overrides: Partial<ClassHitType> & Pick<ClassHitType, 'objectID'>,
): ClassHitType {
  return {
    title: 'Class Title',
    classType: 'Class Type',
    pathName: 'class-type',
    campus: '',
    groupId: 0,
    subtitle: '',
    summary: '',
    coverImage: { sources: [] },
    _geoloc: { lat: 0, lng: 0 },
    startDate: null,
    endDate: null,
    schedule: '',
    topic: 'Finances',
    language: 'English',
    format: 'In-Person',
    ...overrides,
  };
}

describe('buildInterestOnlyClassHits', () => {
  it('builds a card for a class with the toggle on', () => {
    const [hit] = buildInterestOnlyClassHits([
      makeRockClass({
        interestedToggle: 'True',
        url: 'financial-peace',
        classTopic: 'Finances',
      }),
    ]);

    expect(hit).toMatchObject({
      objectID: 'interest-financial-peace',
      pathName: 'financial-peace',
      title: 'Financial Peace',
      summary: 'Get out of debt.',
      topic: 'Finances',
      isInterestOnly: true,
    });
  });

  it.each(['False', '', '0'])('skips a class whose toggle is %j', (toggle) => {
    expect(
      buildInterestOnlyClassHits([
        makeRockClass({ interestedToggle: toggle, url: 'financial-peace' }),
      ]),
    ).toEqual([]);
  });

  it('skips a toggled class without a url', () => {
    expect(
      buildInterestOnlyClassHits([makeRockClass({ interestedToggle: 'True' })]),
    ).toEqual([]);
  });

  it('returns no cards when the Rock fetch returned nothing', () => {
    expect(buildInterestOnlyClassHits([])).toEqual([]);
  });
});

describe('withInterestOnlyClassHits', () => {
  const interest = makeHit({
    objectID: 'interest-financial-peace',
    pathName: 'financial-peace',
    topic: 'Finances',
  });
  const card = makeHit({ objectID: 'grouped-0', pathName: 'alpha' });

  it('appends the card on the unfiltered view', () => {
    expect(withInterestOnlyClassHits([card], [card], [interest], {})).toEqual([
      card,
      interest,
    ]);
  });

  it('skips the card once Algolia has a hit for the same class', () => {
    const algoliaHit = makeHit({ objectID: 'a1', pathName: 'financial-peace' });
    expect(
      withInterestOnlyClassHits([card], [algoliaHit], [interest], {}),
    ).toEqual([card]);
  });

  it('shows the card when its topic is the selected topic', () => {
    expect(
      withInterestOnlyClassHits([], [], [interest], {
        refinementList: { topic: ['Finances'] },
      }),
    ).toEqual([interest]);
  });

  it('hides the card when another topic is selected', () => {
    expect(
      withInterestOnlyClassHits([], [], [interest], {
        refinementList: { topic: ['Parenting'] },
      }),
    ).toEqual([]);
  });

  it('hides the card for a search query', () => {
    expect(
      withInterestOnlyClassHits([], [], [interest], { query: 'finance' }),
    ).toEqual([]);
  });

  it('hides the card when a non-topic filter is active', () => {
    expect(
      withInterestOnlyClassHits([], [], [interest], {
        refinementList: { topic: ['Finances'], format: ['Virtual'] },
      }),
    ).toEqual([]);
  });
});
