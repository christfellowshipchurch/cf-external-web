import { describe, expect, it } from 'vitest';

import type { ClassHitType } from '../../../types';
import {
  buildInterestOnlyClassHits,
  type RockClassDefinedValue,
  pickInterestOnlyClassHits,
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
        image: 'abc-guid',
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

  it('skips a toggled class without an image', () => {
    expect(
      buildInterestOnlyClassHits([
        makeRockClass({ interestedToggle: 'True', url: 'financial-peace' }),
      ]),
    ).toEqual([]);
  });

  it('builds one card when two Rock values share a url', () => {
    const attrs = {
      interestedToggle: 'True',
      url: 'financial-peace',
      image: 'abc-guid',
    };
    expect(
      buildInterestOnlyClassHits([makeRockClass(attrs), makeRockClass(attrs)]),
    ).toHaveLength(1);
  });

  it('returns no cards when the Rock fetch returned nothing', () => {
    expect(buildInterestOnlyClassHits([])).toEqual([]);
  });
});

describe('pickInterestOnlyClassHits', () => {
  const interest = makeHit({
    objectID: 'interest-financial-peace',
    pathName: 'financial-peace',
    topic: 'Finances',
  });
  const card = makeHit({ objectID: 'grouped-0', pathName: 'alpha' });

  it('appends the card on the unfiltered view', () => {
    expect(pickInterestOnlyClassHits([card], [interest], {})).toEqual([
      interest,
    ]);
  });

  it('skips the card once Algolia renders a card for the same class', () => {
    const algoliaCard = makeHit({
      objectID: 'grouped-0',
      pathName: 'financial-peace',
    });
    expect(pickInterestOnlyClassHits([algoliaCard], [interest], {})).toEqual(
      [],
    );
  });

  it('shows the card when its topic is the selected topic', () => {
    expect(
      pickInterestOnlyClassHits([], [interest], {
        refinementList: { topic: ['Finances'] },
      }),
    ).toEqual([interest]);
  });

  it('matches the topic ignoring case and whitespace', () => {
    expect(
      pickInterestOnlyClassHits(
        [],
        [{ ...interest, topic: ' finances ' as ClassHitType['topic'] }],
        {
          refinementList: { topic: ['Finances'] },
        },
      ),
    ).toHaveLength(1);
  });

  it('hides the card when another topic is selected', () => {
    expect(
      pickInterestOnlyClassHits([], [interest], {
        refinementList: { topic: ['Parenting'] },
      }),
    ).toEqual([]);
  });

  it('hides the card for a search query', () => {
    expect(
      pickInterestOnlyClassHits([], [interest], { query: 'finance' }),
    ).toEqual([]);
  });

  it('hides the card when a non-topic filter is active', () => {
    expect(
      pickInterestOnlyClassHits([], [interest], {
        refinementList: { topic: ['Finances'], format: ['Virtual'] },
      }),
    ).toEqual([]);
  });
});
