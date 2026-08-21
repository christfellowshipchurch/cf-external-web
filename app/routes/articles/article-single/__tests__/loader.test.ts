import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({ fetchRockData: vi.fn() }));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { fetchRelatedArticles } from '../loader';

const mockFetch = vi.mocked(fetchRockData);
type RelatedArticleInput = Parameters<typeof fetchRelatedArticles>[0];
const CATEGORY = '11111111-1111-1111-1111-111111111111';
const OTHER_CATEGORY = '22222222-2222-2222-2222-222222222222';
const article = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Article 1',
  content: 'words',
  status: 2,
  startDateTime: '2026-08-01T12:00:00Z',
  attributes: {},
  attributeValues: {
    primaryCategory: { value: CATEGORY, valueFormatted: 'Faith' },
    summary: { value: 'Summary', valueFormatted: 'Summary' },
    url: { value: 'article-1', valueFormatted: 'article-1' },
  },
  ...overrides,
});

describe('fetchRelatedArticles', () => {
  beforeEach(() => mockFetch.mockReset());

  it('requests same category and excludes current article', async () => {
    mockFetch.mockResolvedValue([article(), article({ id: 2 })]);
    const result = await fetchRelatedArticles(article() as RelatedArticleInput);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({
          attributeKey: 'PrimaryCategory',
          value: CATEGORY,
          $filter: expect.stringContaining('Id ne 1'),
        }),
        filterByDateRange: true,
      }),
    );
    expect(result?.articles.map((item) => item.id)).toEqual(['2']);
  });

  it('rejects records outside primary category', async () => {
    mockFetch.mockResolvedValue([
      article({ id: 2 }),
      article({
        id: 3,
        attributeValues: {
          ...article().attributeValues,
          primaryCategory: { value: OTHER_CATEGORY, valueFormatted: 'Other' },
        },
      }),
    ]);
    const result = await fetchRelatedArticles(article() as RelatedArticleInput);
    expect(result?.articles.map((item) => item.id)).toEqual(['2']);
  });

  it('returns empty articles when Rock finds no matches', async () => {
    mockFetch.mockResolvedValue([]);
    await expect(
      fetchRelatedArticles(article() as RelatedArticleInput),
    ).resolves.toMatchObject({ articles: [] });
  });

  it('orders newest first and limits results to six', async () => {
    mockFetch.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) =>
        article({
          id: index + 2,
          startDateTime: `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
        }),
      ),
    );
    const result = await fetchRelatedArticles(article() as RelatedArticleInput);
    expect(result?.articles.map((item) => item.id)).toEqual([
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
    ]);
  });
});
