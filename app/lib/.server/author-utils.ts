import { fetchRockData } from './fetch-rock-data';
import { fetchContentItems } from './rock-content-items';
import { createImageUrlFromGuid } from '~/lib/utils';

export const fetchAuthorData = async ({ authorId }: { authorId: string }) => {
  return fetchRockData({
    endpoint: 'People',
    queryParams: {
      $filter: `Id eq ${authorId}`,
      $expand: 'Photo',
      loadAttributes: 'simple',
    },
  });
};

export const fetchAuthorByPathname = async (pathname: string) => {
  return fetchRockData({
    endpoint: 'People/GetByAttributeValue',
    queryParams: {
      attributeKey: 'Pathname',
      value: pathname,
      $expand: 'Photo',
      loadAttributes: 'simple',
    },
  });
};

interface PersonAlias {
  guid: string;
}

export const fetchPersonAliasGuid = async (primaryAliasId: string) => {
  const personAlias: PersonAlias = await fetchRockData({
    endpoint: 'PersonAlias',
    queryParams: {
      $filter: `Id eq ${primaryAliasId}`,
    },
  });

  return personAlias?.guid;
};

export const fetchAuthorId = async (authorId: string) => {
  return fetchRockData({
    endpoint: 'PersonAlias',
    queryParams: {
      $filter: `Guid eq guid'${authorId}'`,
      $select: 'PersonId',
    },
  });
};

/** Most articles an author page lists. */
const AUTHOR_ARTICLE_LIMIT = 6;

/**
 * Rock applies `$top` before fetchRockData filters the date range in memory, so
 * asking for exactly AUTHOR_ARTICLE_LIMIT would let expired articles consume
 * slots and silently shrink the feed. Over-fetch, then trim to the limit.
 */
const AUTHOR_ARTICLE_FETCH_WINDOW = 30;

/** Rock ContentChannelItem status: 1 = Pending, 2 = Approved, 3 = Denied. */
const ROCK_STATUS_APPROVED = 2;

const isApproved = (article: { status?: number }) =>
  article?.status === ROCK_STATUS_APPROVED;

export const fetchAuthorArticles = async (personAliasGuid: string) => {
  const articles = await fetchContentItems({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'Author',
      value: personAliasGuid,
      $filter: "Status eq 'Approved' and ContentChannelId eq 43",
      $orderby: 'StartDateTime desc',
      $top: String(AUTHOR_ARTICLE_FETCH_WINDOW),
      loadAttributes: 'simple',
    },
    // An author page must not advertise articles that have expired or aren't
    // live yet.
    filterByDateRange: true,
  });

  // fetchRockData collapses a single-item array response into a bare object, so
  // an author with exactly one approved article would otherwise return a
  // non-iterable value and break the callers that map over this list.
  if (!articles) return [];
  const liveArticles = Array.isArray(articles) ? articles : [articles];

  // The $filter above is dropped in preview mode (SHOW_UNAPPROVED_CONTENT),
  // which would surface Pending and — worse — Denied articles in an author's
  // publication list. An author page is a public index rather than a draft
  // preview, so approval is enforced here where preview mode can't strip it.
  return liveArticles.filter(isApproved).slice(0, AUTHOR_ARTICLE_LIMIT);
};

export const getBasicAuthorInfo = async (
  authorId: string,
  pathname: string,
) => {
  const { personId } = await fetchAuthorId(authorId);
  const authorData = await fetchAuthorData({ authorId: personId });

  return {
    fullName:
      authorData.fullName || `${authorData.firstName} ${authorData.lastName}`,
    photo: {
      uri: createImageUrlFromGuid(authorData.photo?.guid),
    },
    authorAttributes: {
      authorId,
      pathname,
    },
  };
};

export const getBasicAuthorInfoByPathname = async (pathname: string) => {
  const authorData = await fetchAuthorByPathname(pathname);

  return {
    fullName:
      authorData.fullName || `${authorData.firstName} ${authorData.lastName}`,
    photo: {
      uri: createImageUrlFromGuid(authorData.photo?.guid),
    },
    authorAttributes: {
      authorId: authorData.id,
      pathname: pathname,
    },
  };
};

// Utility function to check if a string is a GUID
const isGuid = (str: string): boolean => {
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(str);
};

// Hybrid function that can handle both GUID and pathname
export const getBasicAuthorInfoFlexible = async (authorValue: string) => {
  // Check if the value is a GUID
  if (isGuid(authorValue)) {
    // If it's a GUID, fetch the author data to get the pathname
    const { personId } = await fetchAuthorId(authorValue);
    const authorData = await fetchAuthorData({ authorId: personId });
    const pathname = authorData?.attributeValues?.pathname?.value || '';
    return await getBasicAuthorInfo(authorValue, pathname);
  } else {
    // If it's a pathname, use the new method
    return await getBasicAuthorInfoByPathname(authorValue);
  }
};
