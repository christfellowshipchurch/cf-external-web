import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { LoaderFunctionArgs } from 'react-router-dom';
import { createImageUrlFromGuid, ensureArray } from '~/lib/utils';
import { mapRockDataToMessage } from '../messages/message-single/loader';
import {
  getContentType,
  getPathname,
  isGuid,
  isPodcastContentType,
} from '../page-builder/components/builder-utils';
import {
  PODCAST_SHOW_CHANNEL_ID,
  buildPodcastRoutingIndex,
} from '../podcasts/podcast-routing.server';
import { getPodcastCollectionHref } from '../podcasts/utils/podcast-links';
import type { SeriesResource, SeriesEvent } from './types';

const getStringValue = (
  val: string | number | boolean | undefined | null,
): string => {
  if (val == null) return '';
  return String(val);
};

const getAttrValue = (
  attrs: Record<string, { value?: string | number | boolean } | undefined>,
  key: string,
): string => {
  const raw = attrs[key];
  const val =
    raw != null && typeof raw === 'object' && 'value' in raw
      ? (raw as { value?: string | number | boolean }).value
      : (raw as string | number | boolean | undefined);
  return getStringValue(val);
};

const getSeries = async (seriesPath: string) => {
  const fetchSeries = isGuid(seriesPath)
    ? await fetchRockData({
        endpoint: 'DefinedValues',
        queryParams: {
          $filter: `Guid eq guid'${seriesPath}'`,
          loadAttributes: 'simple',
        },
      })
    : await fetchRockData({
        endpoint: 'DefinedValues/GetByAttributeValue',
        queryParams: {
          attributeKey: 'Url',
          value: seriesPath,
          loadAttributes: 'simple',
        },
      });

  if (!fetchSeries) {
    return null;
  }

  const series = ensureArray(fetchSeries);

  return series[0];
};

interface RockResourceItem {
  id: string;
  title: string;
  content?: string;
  contentChannelId: string;
  startDateTime?: string;
  attributeValues?: Record<string, { value?: string | number | boolean }>;
}

// ContentChannelId 63 is messages, 186 is events
const getSeriesResources = async (
  seriesGuid: string,
): Promise<SeriesResource[]> => {
  const seriesResources = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'MessageSeries',
      $filter:
        "ContentChannelId ne 63 and ContentChannelId ne 186 and Status eq 'Approved'",
      value: `${seriesGuid}`,
      loadAttributes: 'simple',
    },
  });

  if (!seriesResources) {
    return [];
  }

  const resources = (
    Array.isArray(seriesResources) ? seriesResources : [seriesResources]
  ) as RockResourceItem[];

  resources.sort((a, b) => {
    const aDate = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
    const bDate = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
    return bDate - aDate; // newest first
  });

  // Podcast episodes live on per-show content channels; the show slug that the
  // `/podcasts/:show/:episode` route needs only exists on the show item, so it
  // has to be resolved through the routing index.
  const podcastIndex = await buildPodcastRoutingIndex();

  const mapped: SeriesResource[] = [];
  for (const resource of resources) {
    const channelId = String(resource.contentChannelId);
    const contentType = getContentType(channelId);
    const attrs = resource.attributeValues ?? {};
    const isPodcastItem =
      channelId === PODCAST_SHOW_CHANNEL_ID ||
      podcastIndex.byEpisodeChannelId.has(channelId) ||
      isPodcastContentType(contentType);

    if (isPodcastItem) {
      const podcastUrl = getPodcastCollectionHref({
        channelId,
        showChannelId: PODCAST_SHOW_CHANNEL_ID,
        showPath: getAttrValue(attrs, 'url') || getAttrValue(attrs, 'pathname'),
        episodePath:
          getAttrValue(attrs, 'pathname') || getAttrValue(attrs, 'url'),
        episodeShowPath:
          podcastIndex.byEpisodeChannelId.get(channelId)?.showPath,
      });

      if (!podcastUrl) {
        console.warn(
          `[series-resources] Skipping podcast item ${resource.id} (channel ${channelId}): could not resolve show path`,
        );
        continue;
      }

      mapped.push({
        id: resource.id,
        title: resource.title,
        summary: getAttrValue(attrs, 'summary') || resource.content || '',
        coverImage: createImageUrlFromGuid(getAttrValue(attrs, 'image')),
        url: podcastUrl,
        contentChannelId: resource.contentChannelId,
        contentType: 'PODCASTS',
      });
      continue;
    }

    if (!contentType) continue;

    const summary = getAttrValue(attrs, 'summary') || resource.content || '';
    const imageGuid = getAttrValue(attrs, 'image');

    let url: string;
    switch (contentType) {
      case 'REDIRECT_CARD':
        // Use the URL 3.0 `pathname` attribute (Rock), then `url` as secondary.
        // No fallback to legacy `redirectUrl` — items without a valid URL 3.0 value should not appear.
        url =
          getAttrValue(attrs, 'pathname') || getAttrValue(attrs, 'url') || '';
        break;
      case 'EVENTS':
        url = getPathname(contentType, getAttrValue(attrs, 'url'));
        break;
      default:
        url = getPathname(
          contentType,
          getAttrValue(attrs, 'pathname') || getAttrValue(attrs, 'url'),
        );
    }

    mapped.push({
      id: resource.id,
      title: resource.title,
      summary,
      coverImage: createImageUrlFromGuid(imageGuid),
      url,
      contentChannelId: resource.contentChannelId,
      contentType,
    });
  }

  return mapped;
};

interface RockEventItem {
  id: string;
  title: string;
  content?: string;
  attributeValues?: Record<string, { value?: string | number | boolean }>;
}

const getSeriesEvents = async (seriesGuid: string): Promise<SeriesEvent[]> => {
  const seriesEvents = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'MessageSeries',
      $filter: "ContentChannelId eq 186 and Status eq 'Approved'",
      value: `${seriesGuid}`,
      loadAttributes: 'simple',
    },
  });

  if (!seriesEvents) {
    return [];
  }

  const events = Array.isArray(seriesEvents) ? seriesEvents : [seriesEvents];

  const mapped: SeriesEvent[] = (events as RockEventItem[]).map((event) => {
    const attrs = event.attributeValues ?? {};
    return {
      id: event.id,
      title: event.title,
      summary: getAttrValue(attrs, 'summary') || event.content || '',
      coverImage: createImageUrlFromGuid(getAttrValue(attrs, 'image')),
      url: getPathname('EVENTS', getAttrValue(attrs, 'url')),
      eventStartDate: getAttrValue(attrs, 'eventStartDate') || undefined,
    };
  });

  mapped.sort((a, b) => {
    const aDate = a.eventStartDate ? new Date(a.eventStartDate).getTime() : 0;
    const bDate = b.eventStartDate ? new Date(b.eventStartDate).getTime() : 0;
    return aDate - bDate; // soonest first
  });

  return mapped;
};

const getSeriesMessages = async (seriesGuid: string) => {
  const seriesMessages = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'MessageSeries',
      $filter: "ContentChannelId eq 63 and Status eq 'Approved'",
      value: `${seriesGuid}`,
      loadAttributes: 'simple',
    },
  });

  if (!seriesMessages) {
    return [];
  }

  return Array.isArray(seriesMessages) ? seriesMessages : [seriesMessages];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const seriesPath = params.path || '';

  const series = await getSeries(seriesPath);

  if (!series) {
    throw new Response('Series not found', {
      status: 404,
      statusText: 'Not Found',
    });
  }

  // Modify the series.attributeValues.coverImage to be a full url -> using createImageUrlFromGuid
  const coverImageRaw = series.attributeValues.coverImage;
  const coverImageGuid =
    typeof coverImageRaw === 'object' &&
    coverImageRaw !== null &&
    'value' in coverImageRaw
      ? String((coverImageRaw as { value: string }).value)
      : String(coverImageRaw ?? '');
  series.attributeValues.coverImage = createImageUrlFromGuid(coverImageGuid);

  const seriesMessageData = await getSeriesMessages(series.guid);

  const messages = await Promise.all(
    seriesMessageData.map(mapRockDataToMessage),
  );

  const resources = await getSeriesResources(series.guid);

  const events = await getSeriesEvents(series.guid);

  return {
    series: series,
    messages,
    resources,
    events,
  };
}
