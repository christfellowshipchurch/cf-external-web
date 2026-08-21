import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  TTL: { LONG: 86400 },
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { RockContentChannelItem } from '~/lib/types/rock-types';
import {
  fetchSectionMessageData,
  selectRelatedMessages,
  selectSeriesMessages,
} from '../loader';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;

const makeRockMessage = (
  id: string,
  overrides: {
    title?: string;
    seriesId?: string;
    primaryTopicIds?: string;
  } = {},
): RockContentChannelItem => ({
  id,
  contentChannelId: '63',
  title: overrides.title ?? `Message ${id}`,
  name: '',
  content: '',
  startDateTime: '2026-08-01T00:00:00Z',
  expireDateTime: '',
  attributes: {},
  attributeValues: {
    summary: { value: `Summary ${id}`, valueFormatted: '' },
    url: { value: `message-${id}`, valueFormatted: '' },
    messageSeries: {
      value: overrides.seriesId ?? '',
      valueFormatted: '',
    },
    primaryCategory: {
      value: overrides.primaryTopicIds ?? '',
      valueFormatted: '',
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchRockData.mockResolvedValue([]);
});

describe('fetchSectionMessageData', () => {
  it('matches series and first primary topic through Rock in parallel', async () => {
    const message = makeRockMessage('current', {
      seriesId: 'series-guid',
      primaryTopicIds: 'topic-guid, second-topic-guid',
    });

    await fetchSectionMessageData(message);

    expect(mockFetchRockData).toHaveBeenCalledTimes(2);
    expect(mockFetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        queryParams: expect.objectContaining({
          attributeKey: 'MessageSeries',
          value: 'series-guid',
        }),
        filterByDateRange: true,
        filterByStatusApproved: true,
      }),
    );
    expect(mockFetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'ContentChannelItems/GetByAttributeValue',
        queryParams: expect.objectContaining({
          attributeKey: 'PrimaryCategory',
          value: 'topic-guid',
        }),
        filterByDateRange: true,
        filterByStatusApproved: true,
      }),
    );
  });

  it('falls back to recent sermons when primary topic is absent', async () => {
    await fetchSectionMessageData(makeRockMessage('current'));

    expect(mockFetchRockData).toHaveBeenCalledTimes(1);
    expect(mockFetchRockData).toHaveBeenCalledWith({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: 'ContentChannelId eq 63',
        $orderby: 'StartDateTime desc',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
      filterByStatusApproved: true,
    });
  });
});

describe('message section selection', () => {
  it('excludes current message from series and caps results at ten', () => {
    const messages = [
      makeRockMessage('current'),
      ...Array.from({ length: 12 }, (_, index) =>
        makeRockMessage(String(index)),
      ),
    ];

    const selected = selectSeriesMessages(messages, 'current');

    expect(selected).toHaveLength(10);
    expect(selected.map((message) => message.id)).not.toContain('current');
  });

  it('excludes current title and series from related messages', () => {
    const selected = selectRelatedMessages(
      [
        makeRockMessage('same-title', { title: 'Current' }),
        makeRockMessage('same-series', { seriesId: 'series-guid' }),
        makeRockMessage('included', { seriesId: 'other-series' }),
      ],
      { title: 'Current', seriesId: 'series-guid' },
    );

    expect(selected.map((message) => message.id)).toEqual(['included']);
  });

  it('returns empty sections when Rock has no matches', () => {
    expect(selectSeriesMessages([], 'current')).toEqual([]);
    expect(
      selectRelatedMessages([], { title: 'Current', seriesId: 'series-guid' }),
    ).toEqual([]);
  });
});
