import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
}));

vi.mock('~/lib/.server/rock-people-groups', () => ({
  fetchPeople: vi.fn(),
  fetchPersonAliases: vi.fn(),
}));

vi.mock('~/lib/.server/rock-content-items', () => ({
  fetchContentItems: vi.fn(),
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { fetchContentItems } from '~/lib/.server/rock-content-items';
import { fetchPersonAliases } from '~/lib/.server/rock-people-groups';
import { getAuthorDetailsByPathname } from '../loader';

// The author lookup by pathname stays on v1; the alias and articles reads are v2.
const mockFetch = fetchRockData as ReturnType<typeof vi.fn>;
const mockFetchPersonAliases = fetchPersonAliases as ReturnType<typeof vi.fn>;
const mockFetchContentItems = fetchContentItems as ReturnType<typeof vi.fn>;

const PERSON = {
  id: 85081,
  fullName: 'Ryan McDermott',
  primaryAliasId: 85090,
  photo: { guid: 'photo-guid' },
  attributeValues: {
    pathname: { value: 'ryan-mcdermott' },
    authorBio: { valueFormatted: '<p>Bio</p>' },
  },
};

const ARTICLE = {
  title: 'Unbound',
  // 2 = Approved. Unapproved articles are filtered out of the author feed.
  status: 2,
  content: 'word '.repeat(400),
  startDateTime: '2025-08-29T13:24:00',
  attributeValues: {
    image: { value: 'image-guid' },
    summary: { value: 'A summary' },
    url: { value: 'unbound' },
  },
};

/**
 * The articles read collapses a single-item array response into a bare object,
 * so it returns an object — not a list — for an author with exactly one
 * approved article.
 */
function mockRockResponses(articlesResponse: unknown) {
  mockFetch.mockResolvedValue(PERSON);
  mockFetchPersonAliases.mockResolvedValue({ guid: 'alias-guid' });
  mockFetchContentItems.mockResolvedValue(articlesResponse);
}

describe('getAuthorDetailsByPathname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regression: CFDP-4181. Authors with exactly one approved article received a
  // bare object here, the loader's .map() threw, and the outer catch turned a
  // healthy author record into a 404. The publication must survive the collapse.
  it('loads an author whose single article collapsed to a bare object', async () => {
    mockRockResponses(ARTICLE);

    const author = await getAuthorDetailsByPathname('ryan-mcdermott');

    expect(author.fullName).toBe('Ryan McDermott');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'People/GetByAttributeValue' }),
    );
    expect(mockFetchContentItems).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({
          attributeKey: 'Author',
          value: 'alias-guid',
        }),
      }),
    );
    expect(author.authorAttributes.publications.articles).toHaveLength(1);
    expect(author.authorAttributes.publications.articles[0]).toMatchObject({
      title: 'Unbound',
      url: 'unbound',
      summary: 'A summary',
    });
  });

  it('loads an author with several articles', async () => {
    mockRockResponses([
      ARTICLE,
      {
        ...ARTICLE,
        title: 'Second',
        attributeValues: { url: { value: 'second' } },
      },
    ]);

    const author = await getAuthorDetailsByPathname('ryan-mcdermott');

    expect(
      author.authorAttributes.publications.articles.map((a) => a.title),
    ).toEqual(['Unbound', 'Second']);
  });

  // An author with no publications is still a valid author page, so an empty
  // article list must not be mistaken for a missing author.
  it('loads an author with no articles', async () => {
    mockRockResponses([]);

    const author = await getAuthorDetailsByPathname('ryan-mcdermott');

    expect(author.fullName).toBe('Ryan McDermott');
    expect(author.authorAttributes.publications.articles).toEqual([]);
  });

  it('throws a 404 when no author matches the pathname', async () => {
    mockFetch.mockResolvedValue(null);

    await expect(getAuthorDetailsByPathname('nobody')).rejects.toMatchObject({
      status: 404,
    });
  });
});
