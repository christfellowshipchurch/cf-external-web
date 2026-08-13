import { LoaderFunction } from 'react-router-dom';
import {
  fetchRockData,
  isItemInDateRange,
} from '~/lib/.server/fetch-rock-data';
import {
  createImageUrlFromGuid,
  getIdentifierType,
  parseRockKeyValueList,
} from '~/lib/utils';
import {
  getContentType,
  getPathname,
  getSectionType,
  isCollectionType,
  isGuid,
} from './components/builder-utils';
import {
  CollectionItem,
  PageBuilderSection,
  PageBuilderLoader,
  SectionType,
} from './types';
import { format, parseISO } from 'date-fns';
import { fetchWistiaDataFromRock } from '~/lib/.server/fetch-wistia-data';
import { getAttributeMatrixItems } from '~/lib/.server/rock-utils';
import {
  buildPodcastRoutingIndex,
  PODCAST_SHOW_CHANNEL_ID,
  PodcastRoutingIndex,
  PodcastShowRouteInfo,
} from '../podcasts/podcast-routing.server';

// Type definitions for Rock API responses
interface ChildReference {
  childContentChannelItemId: string;
}

interface RockAttributeValue {
  value: string | number | boolean;
}

// Helper function to safely convert attribute values to strings
const getStringValue = (value: string | number | boolean): string => {
  return String(value);
};

const getBooleanValue = (
  value: string | number | boolean | null | undefined,
): boolean => {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === 'on' || normalized === '1';
};

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

interface RockAttributeValues {
  [key: string]: RockAttributeValue;
}

interface RockContentItem {
  id: string;
  status: number;
  title: string;
  titleOverride?: string;
  content: string;
  contentChannelId: string;
  startDateTime?: string;
  expireDateTime?: string;
  attributeValues?: RockAttributeValues;
}

interface RockAttributeMatrixItem {
  id: string;
  attributeValues: {
    header?: RockAttributeValue;
    content?: RockAttributeValue;
    image?: RockAttributeValue;
    title?: RockAttributeValue;
    summary?: RockAttributeValue;
    cardTitle?: RockAttributeValue;
    cardSummary?: RockAttributeValue;
  };
}

export const fetchChildItems = async (
  id: string,
): Promise<RockContentItem[]> => {
  const childReferences = toArray<ChildReference>(
    await fetchRockData({
      endpoint: 'ContentChannelItemAssociations',
      queryParams: {
        loadAttributes: 'simple',
        $filter: `ContentChannelItemId eq ${id}`,
        $orderby: 'Order',
      },
    }),
  );

  if (childReferences.length === 0) {
    return [];
  }

  const children = await Promise.all(
    childReferences.map(({ childContentChannelItemId }) =>
      fetchRockData({
        endpoint: 'ContentChannelItems',
        queryParams: {
          $filter: `Id eq ${childContentChannelItemId}`,
          loadAttributes: 'simple',
        },
        filterByStatusApproved: true,
      }),
    ),
  );

  return children.flatMap((child) => toArray<RockContentItem>(child));
};

export const fetchDefinedValue = async (guid: string) => {
  const definedValue = await fetchRockData({
    endpoint: `DefinedValues/`,
    queryParams: {
      $filter: `Guid eq guid'${guid}'`,
    },
  });

  if (!definedValue) {
    throw new Error(`Defined value not found for GUID: ${guid}`);
  }

  // ensure definedValue is an array
  const definedValueArray = Array.isArray(definedValue)
    ? definedValue
    : [definedValue];

  if (definedValueArray.length > 0) {
    return definedValueArray[0].value;
  } else {
    return '';
  }
};

const getLinkTreeLayout = async (attributeValues: RockAttributeValues) => {
  if (attributeValues?.linkTreeLayout) {
    return await fetchDefinedValue(
      getStringValue(attributeValues.linkTreeLayout.value),
    );
  }
  return undefined;
};

export const mapPageBuilderChildItems = async (
  children: RockContentItem[],
  options: { summaryFallbackToContent?: boolean } = {},
): Promise<PageBuilderSection[]> => {
  // When false, collection items with no `summary` attribute leave the summary
  // blank instead of falling back to the item's HTML body content. Link tree
  // cards opt out so empty-summary articles don't render raw content.
  const { summaryFallbackToContent = true } = options;
  // Build the podcast routing index once if any section is a collection.
  // This resolves Rock show items once for all collections in this call so that
  // episode items can be routed to /podcasts/:showPath/:episodePath without
  // hardcoding any show-specific content channel IDs.
  const hasCollections = children.some((child) =>
    isCollectionType(child.contentChannelId),
  );
  const podcastIndex: PodcastRoutingIndex = hasCollections
    ? await buildPodcastRoutingIndex()
    : { byEpisodeChannelId: new Map<string, PodcastShowRouteInfo>() };

  return Promise.all(
    // Map over the children and define the PageBuilder Section Type
    children.map(async (child) => {
      const typeId = child.contentChannelId;
      const isCollection = isCollectionType(typeId);
      const sectionType = getSectionType(typeId) as SectionType;

      // Map the attribute values to a key-value object for easier access
      const attributeValues = Object.fromEntries(
        Object.entries(child.attributeValues || {}).map(
          ([key, obj]: [string, RockAttributeValue]) => [key, obj.value],
        ),
      );

      if (!sectionType) {
        throw new Error(
          `Invalid section type for content channel ID: ${typeId}`,
        );
      }

      // Create the base child - represents a section in the page builder
      const baseChild: PageBuilderSection = {
        id: child.id,
        type: sectionType,
        name: child.title,
        titleOverride: getStringValue(
          child.attributeValues?.titleOverride?.value ?? '',
        ),
        hideTitle: getBooleanValue(
          child.attributeValues?.hideTitle?.value ?? attributeValues?.hideTitle,
        ),
        content: child.content,
        linkTreeLayout: await getLinkTreeLayout(child.attributeValues || {}),
        viewMoreLink: child.attributeValues?.viewAllButton?.value as
          | string
          | undefined,
      };

      // If the child is a collection, fetch the child items and return them
      if (isCollection) {
        const collection = await fetchChildItems(child.id);
        const now = new Date();
        const visibleItems = collection.filter((item: RockContentItem) =>
          isItemInDateRange(item, now),
        );
        return {
          ...baseChild,
          collection: visibleItems.flatMap(
            (item: RockContentItem): CollectionItem[] => {
              const channelId = String(item.contentChannelId);

              // Flatten attribute values (needed for all routing paths)
              const itemAttributeValues = Object.fromEntries(
                Object.entries(item.attributeValues || {}).map(
                  ([key, obj]: [string, RockAttributeValue]) => [
                    key,
                    obj.value,
                  ],
                ),
              );

              // --- Podcast show channel item → /podcasts/:showPath ---
              if (channelId === PODCAST_SHOW_CHANNEL_ID) {
                const showPath = getStringValue(
                  itemAttributeValues?.url ||
                    itemAttributeValues?.pathname ||
                    '',
                )
                  .trim()
                  .replace(/^\/+/, '');

                if (!showPath) {
                  console.warn(
                    `[page-builder] Skipping podcast show item ${item.id}: missing url/pathname attribute`,
                  );
                  return [];
                }

                const summary =
                  getStringValue(itemAttributeValues?.summary || '') ||
                  (summaryFallbackToContent ? item.content : '');
                let startDate = '';
                if (item.startDateTime) {
                  startDate = format(
                    parseISO(item.startDateTime),
                    'EEE dd MMM yyyy',
                  );
                }

                return [
                  {
                    id: item.id,
                    contentChannelId: channelId,
                    contentType: 'PODCASTS' as const,
                    name: item.title,
                    summary,
                    image:
                      createImageUrlFromGuid(
                        getStringValue(itemAttributeValues?.image || ''),
                      ) || '',
                    startDate,
                    pathname: `/podcasts/${showPath}`,
                  },
                ];
              }

              // --- Podcast episode channel item → /podcasts/:showPath/:episodePath ---
              const episodeShowInfo =
                podcastIndex.byEpisodeChannelId.get(channelId);
              if (episodeShowInfo) {
                const episodePath = getStringValue(
                  itemAttributeValues?.pathname ||
                    itemAttributeValues?.url ||
                    '',
                )
                  .trim()
                  .replace(/^\/+/, '');

                if (!episodePath) {
                  console.warn(
                    `[page-builder] Skipping podcast episode item ${item.id}: missing pathname/url attribute`,
                  );
                  return [];
                }

                const summary =
                  getStringValue(itemAttributeValues?.summary || '') ||
                  (summaryFallbackToContent ? item.content : '');
                let startDate = '';
                if (item.startDateTime) {
                  startDate = format(
                    parseISO(item.startDateTime),
                    'EEE dd MMM yyyy',
                  );
                }

                return [
                  {
                    id: item.id,
                    contentChannelId: channelId,
                    contentType: 'PODCASTS' as const,
                    name: item.title,
                    summary,
                    image:
                      createImageUrlFromGuid(
                        getStringValue(itemAttributeValues?.image || ''),
                      ) || '',
                    startDate,
                    pathname: `/podcasts/${episodeShowInfo.showPath}/${episodePath}`,
                  },
                ];
              }

              // --- Non-podcast items: existing contentType-based routing ---
              const contentType = getContentType(channelId);

              if (!contentType) {
                console.warn(
                  `[page-builder] Skipping unsupported collection item ${item.id} with content channel ID ${channelId}`,
                );
                return [];
              }

              // If this channel maps to a known podcast content type but was NOT
              // found in the routing index, skip it. We cannot determine the
              // correct show path and must not generate a guessed URL.
              if (
                contentType === 'PODCASTS' ||
                contentType === 'CREW_CAST' ||
                contentType === 'YOUNG_+_ADULTING' ||
                contentType === 'SO_GOOD_SISTERHOOD' ||
                contentType === 'MADE_FOR_MORE'
              ) {
                console.warn(
                  `[page-builder] Skipping podcast item ${item.id} (channel ${channelId}, type ${contentType}): could not resolve show via routing index`,
                );
                return [];
              }

              // Generate the summary for the item. Fall back to body content
              // (item.content) when no summary attribute is set, matching the
              // pattern used for podcast items above.
              const summary =
                getStringValue(itemAttributeValues?.summary || '') ||
                (summaryFallbackToContent ? item.content : '') ||
                '';

              // Events have a dedicated "Card Subtitle" attribute (plain text,
              // no HTML) that takes priority over `summary` as the collection
              // card description.
              const cardSubtitle =
                contentType === 'EVENTS'
                  ? getStringValue(itemAttributeValues?.cardSubtitle || '') ||
                    undefined
                  : undefined;

              // Generate the pathname for the item
              let pathname: string;
              switch (contentType) {
                case 'REDIRECT_CARD':
                  // Use the URL 3.0 `pathname` attribute (Rock), then `url` as secondary.
                  // No fallback to legacy `redirectUrl` — items without a valid URL 3.0 value should not appear.
                  pathname = getStringValue(
                    itemAttributeValues?.pathname ||
                      itemAttributeValues?.url ||
                      '',
                  );
                  break;
                case 'EVENTS':
                  pathname = getPathname(
                    contentType,
                    getStringValue(itemAttributeValues?.url || ''),
                  );
                  break;
                default:
                  pathname = getPathname(
                    contentType,
                    getStringValue(itemAttributeValues?.pathname || ''),
                  );
              }

              // Generate the start date for the item.
              // Page Builder, Redirect Card, Article, and Ministry Page items have
              // no meaningful start date in a collection context, so skip it.
              let startDate = '';
              if (
                contentType !== 'REDIRECT_CARD' &&
                contentType !== 'PAGE_BUILDER' &&
                contentType !== 'ARTICLES' &&
                contentType !== 'MINISTRY_PAGE'
              ) {
                const startDateTime = item.startDateTime || '';
                if (startDateTime) {
                  startDate = format(
                    parseISO(startDateTime),
                    'EEE dd MMM yyyy',
                  );
                }
              }

              return [
                {
                  id: item.id,
                  contentChannelId: item.contentChannelId,
                  contentType: contentType,
                  name: item.title,
                  summary,
                  cardSubtitle,
                  image:
                    createImageUrlFromGuid(
                      getStringValue(itemAttributeValues?.image || ''),
                    ) || '',
                  startDate,
                  pathname,
                  disableCard:
                    contentType === 'REDIRECT_CARD'
                      ? getBooleanValue(itemAttributeValues?.disableCard)
                      : undefined,
                },
              ];
            },
          ),
        };
      }

      // If the section is a content block, fetch the defined values for any GUIDs that are not the cover image or video
      if (sectionType === 'CONTENT_BLOCK') {
        const updatedValues = await Promise.all(
          Object.entries(attributeValues || {}).map(async ([key, value]) => {
            const processedValue =
              typeof value === 'string' &&
              isGuid(value) &&
              key !== 'coverImage' &&
              key !== 'video'
                ? await fetchDefinedValue(value)
                : getStringValue(value);
            return [key, processedValue];
          }),
        );

        const processedValues = Object.fromEntries(updatedValues);

        const fetchVideo = attributeValues?.featureVideo
          ? (
              await fetchWistiaDataFromRock(
                getStringValue(attributeValues.featureVideo),
              )
            ).sourceKey
          : null;

        return {
          ...baseChild,
          ...processedValues,
          coverImage: createImageUrlFromGuid(
            getStringValue(attributeValues?.coverImage || ''),
          ),
          featureVideo: fetchVideo,
        };
      }

      if (sectionType === 'FAQs') {
        const { id: matrixId } = await fetchRockData({
          endpoint: `AttributeMatrices`,
          queryParams: {
            $filter: `Guid eq guid'${getStringValue(
              attributeValues?.faqs || '',
            )}'`,
            $select: 'Id',
          },
        });

        const faqs = await fetchRockData({
          endpoint: `AttributeMatrixItems`,
          queryParams: {
            $filter: `AttributeMatrix/${getIdentifierType(matrixId).query}`,
            $orderby: 'Order',
            loadAttributes: 'simple',
          },
        });

        return {
          ...baseChild,
          stillHaveQuestionsLink: getStringValue(
            attributeValues?.stillHaveQuestionsLink || '',
          ),
          faqs: faqs.map((faq: RockAttributeMatrixItem) => ({
            id: faq.id,
            question: getStringValue(faq.attributeValues.header?.value ?? ''),
            answer: getStringValue(faq.attributeValues.content?.value ?? ''),
          })),
        };
      }

      if (sectionType === 'IMAGE_GALLERY') {
        const imagesGuid = getStringValue(attributeValues?.images || '');

        if (!imagesGuid) {
          console.error(
            'IMAGE_GALLERY section is missing the images attribute:',
            child.id,
          );
          return { ...baseChild, imageGallery: [] };
        }

        try {
          const imageGallery = await getAttributeMatrixItems({
            attributeMatrixGuid: imagesGuid,
          });

          return {
            ...baseChild,
            imageGallery: imageGallery.map((image) => {
              const title = getStringValue(
                image.attributeValues?.cardTitle?.value ??
                  image.attributeValues?.title?.value ??
                  '',
              ).trim();
              const summary = getStringValue(
                image.attributeValues?.cardSummary?.value ??
                  image.attributeValues?.summary?.value ??
                  '',
              ).trim();

              return {
                id: String(image.id),
                image: createImageUrlFromGuid(
                  getStringValue(image.attributeValues?.image?.value ?? ''),
                ),
                ...(title ? { title } : {}),
                ...(summary ? { summary } : {}),
              };
            }),
          };
        } catch (error) {
          console.error(
            'Failed to load IMAGE_GALLERY section:',
            child.id,
            error,
          );
          return { ...baseChild, imageGallery: [] };
        }
      }

      return baseChild;
    }),
  );
};

export const loader: LoaderFunction = async ({ params }) => {
  try {
    const pathname = params?.path;

    if (!pathname) {
      throw new Response('Pathname is required', {
        status: 400,
        statusText: 'Bad Request',
      });
    }

    const pageData = await fetchRockData({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        value: pathname,
        loadAttributes: 'simple',
        $filter: 'ContentChannelId eq 176',
      },
      // Only approved pages are publicly accessible (matches articles/events/messages).
      filterByStatusApproved: true,
    });

    // Handle case where pageData might be an array or null/undefined
    if (!pageData) {
      throw new Response(`Page not found with pathname: ${pathname}`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    // Ensure pageData is a single object, not an array
    const page = Array.isArray(pageData) ? pageData[0] : pageData;

    if (!page || !page.id) {
      throw new Response(`Page not found with pathname: ${pathname}`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    // Time-based publishing: a page with a future StartDateTime or a past
    // ExpireDateTime is not publicly accessible. Undated pages stay visible.
    if (!isItemInDateRange(page, new Date())) {
      throw new Response(`Page not available with pathname: ${pathname}`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    const children = await fetchChildItems(page.id);
    const mappedChildren = await mapPageBuilderChildItems(children);

    const pageBuilder: PageBuilderLoader = {
      title: page.title,
      heroImage:
        createImageUrlFromGuid(
          getStringValue(page.attributeValues?.image?.value || ''),
        ) || '',
      content: page.content,
      callsToAction:
        parseRockKeyValueList(
          getStringValue(page.attributeValues?.callsToAction?.value || ''),
        ).map((cta) => ({
          title: cta.key,
          url: cta.value,
        })) || [],
      sections: mappedChildren,
    };

    return pageBuilder;
  } catch (error) {
    console.warn('Error in page builder loader:', error);

    // If it's already a Response, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    throw new Response('Failed to load page content', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
};
