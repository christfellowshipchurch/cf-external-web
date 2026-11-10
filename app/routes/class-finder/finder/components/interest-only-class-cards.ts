import type { RockContentChannelItem } from '~/lib/types/rock-types';
import { createImageUrlFromGuid } from '~/lib/utils';

import type { ClassHitType } from '../../types';
import { CLASS_INTEREST_TOGGLE_ATTRIBUTE_KEY } from '../../constants';

/**
 * TEMPORARY override: Rock 387 classes with the "I'm Interested" toggle on are
 * meant to reach the finder as Algolia catalog rows (c4cf827d). Until the
 * indexer emits those rows, build cards for them from Rock. Any class that
 * already has an Algolia hit is skipped, so this switches itself off once the
 * index catches up.
 */

export type RockClassDefinedValue = RockContentChannelItem & {
  value?: string;
  description?: string;
};

function rockAttr(item: RockClassDefinedValue, key: string): string {
  const v = item.attributeValues?.[key]?.value;
  return typeof v === 'string' ? v.trim() : '';
}

function rockAttrFormatted(item: RockClassDefinedValue, key: string): string {
  const v = item.attributeValues?.[key]?.valueFormatted;
  return typeof v === 'string' ? v.trim() : '';
}

/** Rock boolean attributes come back as strings ("True"/"False"/"1"/""). */
function isToggleOn(item: RockClassDefinedValue): boolean {
  const v = rockAttr(item, CLASS_INTEREST_TOGGLE_ATTRIBUTE_KEY).toLowerCase();
  return v === 'true' || v === '1';
}

export function buildInterestOnlyClassHits(
  items: RockClassDefinedValue[],
): ClassHitType[] {
  const hits: ClassHitType[] = [];

  for (const item of items) {
    if (!isToggleOn(item)) continue;

    const pathName = rockAttr(item, 'url');
    const title = item.value?.trim() ?? '';
    if (!pathName || !title) continue;

    const imageGuid = rockAttr(item, 'image');

    hits.push({
      objectID: `interest-${pathName}`,
      title,
      classType: title,
      pathName,
      campus: '',
      groupId: 0,
      subtitle: '',
      summary: item.description?.trim() ?? '',
      coverImage: {
        sources: imageGuid ? [{ uri: createImageUrlFromGuid(imageGuid) }] : [],
      },
      _geoloc: { lat: 0, lng: 0 },
      startDate: null,
      endDate: null,
      schedule: '',
      topic: rockAttrFormatted(item, 'classTopic') as ClassHitType['topic'],
      language: 'English',
      format: 'In-Person',
      isInterestOnly: true,
    });
  }

  return hits;
}

/**
 * Appends interest-only cards whose `pathName` has no Algolia hit. They have no
 * language, format or search data, so they show on the unfiltered view and when
 * only topic filters are active (matched against the Rock topic).
 */
export function withInterestOnlyClassHits(
  cards: ClassHitType[],
  algoliaHits: ClassHitType[],
  interestOnlyHits: ClassHitType[],
  uiState: { query?: string; refinementList?: Record<string, string[]> },
): ClassHitType[] {
  if (interestOnlyHits.length === 0) return cards;

  const hasQuery = (uiState.query?.trim().length ?? 0) > 0;
  const refinements = Object.entries(uiState.refinementList ?? {}).filter(
    ([, values]) => values.length > 0,
  );
  if (hasQuery) return cards;
  if (refinements.some(([attribute]) => attribute !== 'topic')) return cards;

  const topics = uiState.refinementList?.topic ?? [];
  const indexedPaths = new Set(
    algoliaHits.map((hit) => hit.pathName?.trim()).filter(Boolean),
  );

  const extras = interestOnlyHits.filter(
    (hit) =>
      !indexedPaths.has(hit.pathName) &&
      (topics.length === 0 || topics.includes(hit.topic)),
  );

  return extras.length > 0 ? [...cards, ...extras] : cards;
}
