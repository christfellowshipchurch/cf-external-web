import type { LoaderFunction } from 'react-router-dom';
import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';
import {
  createImageUrlFromGuid,
  ensureArray,
  parseRockKeyValueList,
} from '~/lib/utils';
import type { MessageCardType, MessageType } from '../types';
import { fetchWistiaDataFromRock } from '~/lib/.server/fetch-wistia-data';
import type {
  attributeProps,
  attributeValuesProps,
  RockContentChannelItem,
} from '~/lib/types/rock-types';
import { getImages } from '~/lib/.server/rock-utils';

export type LoaderReturnType = {
  message: MessageType;
  seriesMessages: MessageCardType[];
  relatedMessages: MessageCardType[];
  hostUrl: string;
};

const MESSAGE_CHANNEL_ID = 63;
const SECTION_RESULT_LIMIT = 10;

const toRockItems = (data: unknown): RockContentChannelItem[] => {
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as RockContentChannelItem[];
};

export const mapRockDataToMessageCard = (
  rockItem: RockContentChannelItem,
): MessageCardType => {
  const coverImages = getImages({
    attributeValues: rockItem.attributeValues as attributeValuesProps,
    attributes: rockItem.attributes as attributeProps,
  });

  return {
    id: rockItem.id,
    title: rockItem.title,
    summary: rockItem.attributeValues?.summary?.value || '',
    coverImage:
      coverImages?.[0] ||
      createImageUrlFromGuid(rockItem.attributeValues?.image?.value || '') ||
      '',
    url: rockItem.attributeValues?.url?.value || '',
  };
};

export const selectSeriesMessages = (
  items: RockContentChannelItem[],
  currentId: string,
): MessageCardType[] =>
  items
    .filter((item) => String(item.id) !== String(currentId))
    .slice(0, SECTION_RESULT_LIMIT)
    .map(mapRockDataToMessageCard);

export const selectRelatedMessages = (
  items: RockContentChannelItem[],
  currentMessage: Pick<MessageType, 'title' | 'seriesId'>,
): MessageCardType[] =>
  items
    .filter(
      (item) =>
        item.title !== currentMessage.title &&
        (item.attributeValues?.messageSeries?.value || '') !==
          currentMessage.seriesId,
    )
    .slice(0, SECTION_RESULT_LIMIT)
    .map(mapRockDataToMessageCard);

export const fetchSectionMessageData = async (
  messageData: RockContentChannelItem,
): Promise<{
  seriesItems: RockContentChannelItem[];
  relatedItems: RockContentChannelItem[];
}> => {
  const seriesGuid = messageData.attributeValues?.messageSeries?.value?.trim();
  const primaryTopicGuid = messageData.attributeValues?.primaryCategory?.value
    ?.split(',')[0]
    ?.trim();

  const commonOptions = {
    queryParams: {
      $filter: `ContentChannelId eq ${MESSAGE_CHANNEL_ID}`,
      $orderby: 'StartDateTime desc',
      loadAttributes: 'simple' as const,
    },
    filterByDateRange: true,
    filterByStatusApproved: true,
  };

  const seriesRequest = seriesGuid
    ? fetchRockData({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        ...commonOptions,
        queryParams: {
          ...commonOptions.queryParams,
          attributeKey: 'MessageSeries',
          value: seriesGuid,
        },
      })
    : Promise.resolve([]);

  const relatedRequest = primaryTopicGuid
    ? fetchRockData({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        ...commonOptions,
        queryParams: {
          ...commonOptions.queryParams,
          attributeKey: 'PrimaryCategory',
          value: primaryTopicGuid,
        },
      })
    : fetchRockData({
        endpoint: 'ContentChannelItems',
        ...commonOptions,
      });

  const [seriesData, relatedData] = await Promise.all([
    seriesRequest,
    relatedRequest,
  ]);

  return {
    seriesItems: toRockItems(seriesData),
    relatedItems: toRockItems(relatedData),
  };
};

export const mapRockDataToMessage = async (
  rockItem: RockContentChannelItem,
): Promise<MessageType> => {
  const { attributeValues, attributes, startDateTime, expireDateTime } =
    rockItem;

  const coverImage = getImages({
    attributeValues: attributeValues as attributeValuesProps,
    attributes: attributes as attributeProps,
  });

  const speaker = await fetchSpeakerData(
    rockItem.attributeValues?.author?.value || '',
  );

  let primaryCategories: { value: string }[] = [{ value: '' }];
  let secondaryCategories: { value: string }[] = [{ value: '' }];

  if (rockItem.attributeValues.primaryCategory?.value) {
    // Separate the primary category into an array of values
    const categoryValues =
      rockItem.attributeValues.primaryCategory?.value.split(',');

    // Loop through all category values and fetch their details
    const sermonPrimaryCategories: { value: string }[] = [];
    for (const categoryGuid of categoryValues) {
      const sermonPrimaryCategory = await fetchRockData({
        endpoint: `DefinedValues/`,
        queryParams: {
          $filter: `Guid eq guid'${categoryGuid.trim()}'`,
          $select: 'Value',
        },
        ttl: TTL.LONG,
      });

      if (sermonPrimaryCategory && sermonPrimaryCategory.length > 0) {
        sermonPrimaryCategories.push(sermonPrimaryCategory[0]);
      } else {
        sermonPrimaryCategories.push(sermonPrimaryCategory);
      }
    }

    primaryCategories = sermonPrimaryCategories;
  }

  if (rockItem.attributeValues.secondaryCategory?.value) {
    const categoryValues =
      rockItem.attributeValues.secondaryCategory?.value.split(',');

    const sermonSecondaryCategories: { value: string }[] = [];
    for (const categoryGuid of categoryValues) {
      const sermonSecondaryCategory = await fetchRockData({
        endpoint: `DefinedValues/`,
        queryParams: {
          $filter: `Guid eq guid'${categoryGuid.trim()}'`,
          $select: 'Value',
        },
      });

      if (sermonSecondaryCategory && sermonSecondaryCategory.length > 0) {
        sermonSecondaryCategories.push(sermonSecondaryCategory[0]);
      } else {
        sermonSecondaryCategories.push(sermonSecondaryCategory);
      }
    }

    secondaryCategories = sermonSecondaryCategories;
  }

  let seriesUrl = '';
  const seriesGuid = rockItem.attributeValues?.messageSeries?.value;
  if (seriesGuid) {
    const seriesData = await fetchRockData({
      endpoint: `DefinedValues/`,
      queryParams: {
        $filter: `Guid eq guid'${seriesGuid}'`,
        loadAttributes: 'simple',
      },
      ttl: TTL.LONG,
    });
    seriesUrl = seriesData?.attributeValues?.url?.value || '';
  }

  let video = '';
  const mediaValue = attributeValues?.media?.value;
  if (mediaValue?.trim()) {
    try {
      const wistiaData = await fetchWistiaDataFromRock(mediaValue);
      video = wistiaData?.sourceKey || '';
    } catch (error) {
      console.error('Error fetching Wistia data for message:', error);
    }
  }

  return {
    id: rockItem.id,
    title: rockItem.title,
    content: rockItem.content || '',
    summary: attributeValues?.summary?.value || '',
    image: createImageUrlFromGuid(attributeValues?.image?.value || '') || '',
    video,
    coverImage: (coverImage && coverImage[0]) || '',
    primaryCategories,
    secondaryCategories,
    startDateTime: startDateTime || '',
    expireDateTime: expireDateTime || '',
    seriesId: rockItem.attributeValues?.messageSeries?.value || '',
    seriesTitle: rockItem.attributeValues?.messageSeries?.valueFormatted || '',
    seriesUrl,
    speaker,
    url: rockItem.attributeValues?.url?.value || '',
    additionalResources: parseRockKeyValueList(
      rockItem.attributeValues?.callsToAction?.value || '',
    ).map((resource) => ({
      title: resource.key,
      url: resource.value,
    })),
  };
};

const fetchMessageByPath = async (path: string) => {
  const rockData = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'Url',
      $filter: "Status eq 'Approved' and ContentChannelId eq 63",
      value: path,
      loadAttributes: 'simple',
    },
    filterByDateRange: true,
  });

  const messages = ensureArray(rockData);

  if (messages.length === 0) {
    return null;
  }

  if (messages.length > 1) {
    console.error(
      `More than one message was found with the same path: /messages/${path}`,
    );
  }

  return messages[0];
};

// TODO: Centralize this function to work with articles, messages, series, authors, etc.
const fetchSpeakerData = async (guid: string) => {
  let authorAlias = null;

  try {
    authorAlias = await fetchRockData({
      endpoint: 'PersonAlias',
      queryParams: {
        $filter: `Guid eq guid'${guid}'`,
        $select: 'PersonId',
      },
      ttl: TTL.LONG,
    });
    authorAlias = ensureArray(authorAlias);
  } catch (error) {
    console.error('Error fetching author id', error);
  }

  if (authorAlias && authorAlias.length > 0) {
    let author = null;
    try {
      author = await fetchRockData({
        endpoint: 'People',
        queryParams: {
          $filter: `Id eq ${authorAlias[0].personId}`,
          $expand: 'Photo',
        },
        ttl: TTL.LONG,
      });

      author = ensureArray(author);

      if (author && author.length > 0) {
        return {
          fullName: author[0].firstName + ' ' + author[0].lastName,
          profilePhoto: author[0].photo.path,
          guid: author[0].guid,
        };
      }
    } catch (error) {
      console.error('Error fetching author data', error);
    }

    return author;
  }

  return null;
};

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<LoaderReturnType> => {
  const path = params?.path || '';
  const origin = new URL(request.url).origin;

  const messageData = await fetchMessageByPath(path);

  if (!messageData) {
    throw new Response(`Message not found at: /messages/${path}`, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const [message, sectionData] = await Promise.all([
    mapRockDataToMessage(messageData),
    fetchSectionMessageData(messageData),
  ]);

  return {
    message,
    seriesMessages: selectSeriesMessages(sectionData.seriesItems, message.id),
    relatedMessages: selectRelatedMessages(sectionData.relatedItems, message),
    hostUrl: origin,
  };
};
