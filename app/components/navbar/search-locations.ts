import type { ContentItemHit } from '~/routes/search/types';

import type { MobileContentHitType } from './mobile/search/mobile-content-hit.component';

export type GlobalSearchLocationHit = {
  campusName?: string;
  campusUrl?: string;
  campusCardImage?: string;
  campusImage?: string;
  campusLocation?: {
    city?: string;
    state?: string;
    street1?: string;
    street2?: string;
  };
  objectID?: string;
};

function hasNonBlankCampusUrl(hit: GlobalSearchLocationHit): boolean {
  return typeof hit.campusUrl === 'string' && hit.campusUrl.trim().length > 0;
}

function isValidLocationHit(
  hit: GlobalSearchLocationHit,
): hit is GlobalSearchLocationHit & { campusName: string; campusUrl: string } {
  return Boolean(hit?.campusName && hasNonBlankCampusUrl(hit));
}

/** Locations index browse works with an empty query; campus names are matched locally. */
export function filterLocationHitsByQuery(
  hits: GlobalSearchLocationHit[],
  query: string,
): GlobalSearchLocationHit[] {
  const validHits = hits.filter(isValidLocationHit);
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return validHits;
  }

  return validHits.filter((hit) => {
    const searchableValues = [
      hit.campusName,
      hit.campusUrl,
      hit.campusLocation?.city,
      hit.campusLocation?.state,
      hit.campusLocation?.street1,
      hit.campusLocation?.street2,
    ];

    return searchableValues.some((value) =>
      value?.toLowerCase().includes(normalizedQuery),
    );
  });
}

export function toDesktopLocationContentHit(
  hit: GlobalSearchLocationHit,
): ContentItemHit {
  const uri = hit.campusCardImage?.trim() || hit.campusImage?.trim();

  return {
    title: hit.campusName || '',
    contentType: 'Location',
    url: hit.campusUrl || '',
    routing: {
      pathname: hit.campusUrl || '',
    },
    summary: '',
    rockItemId: 0,
    author: {
      firstName: '',
      lastName: '',
      profileImage: '',
    },
    priority: 0,
    action: '',
    imageLabel: '',
    sermonPrimaryCategories: [],
    sermonSecondaryCategories: [],
    articlePrimaryCategories: [],
    articleSecondaryCategories: [],
    articleReadTime: 0,
    startDateTime: '',
    coverImage: {
      sources: uri ? [{ uri }] : [],
    },
    _typename: '',
    objectID: hit.objectID || `location-${hit.campusUrl}`,
    _highlightResult: {
      title: {
        value: hit.campusName || '',
        matchLevel: 'none',
        matchedWords: [],
      },
      summary: {
        value: '',
        matchLevel: 'none',
        matchedWords: [],
      },
      author: {
        firstName: {
          value: '',
          matchLevel: 'none',
          matchedWords: [],
        },
        lastName: {
          value: '',
          matchLevel: 'none',
          matchedWords: [],
        },
      },
      routing: {
        pathname: {
          value: hit.campusUrl || '',
          matchLevel: 'none',
          matchedWords: [],
        },
      },
      htmlContent: [],
    },
    __position: 0,
  };
}

export function toMobileLocationContentHit(
  hit: GlobalSearchLocationHit,
): MobileContentHitType {
  const uri = hit.campusCardImage?.trim() || hit.campusImage?.trim();

  return {
    routing: {
      pathname: `locations/${hit.campusUrl || ''}`,
    },
    coverImage: uri ? { sources: [{ uri }] } : null,
    title: hit.campusName || '',
    contentType: 'Location',
    summary: '',
  };
}
