import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchRockData: vi.fn(),
}));

vi.mock('~/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createImageUrlFromGuid: (guid: string) => `https://cdn.example.com/${guid}`,
}));

import { fetchRockData } from '../fetch-rock-data';
import {
  fetchAuthorArticles,
  fetchAuthorId,
  getBasicAuthorInfoByPathname,
} from '../author-utils';

const ALIAS_GUID = '1b5c2e3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
const PAST = '2020-07-01T00:00:00-04:00';
const FUTURE = '2999-01-01T00:00:00-04:00';

/** A search row as Rock v2 returns it: enum names, offset dates, read-back lookup value. */
const article = (
  title: string,
  status = 'Approved',
  dates: { startDateTime?: string; expireDateTime?: string } = {
    startDateTime: PAST,
  },
) => ({
  id: title.length,
  contentChannelId: 43,
  title,
  status,
  ...dates,
  lookupValue: ALIAS_GUID,
});

const stubSearch = (items: unknown[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: items.length, items }),
      text: async () => '',
    }),
  );

const sentBody = () =>
  JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body));

const titles = (articles: { title?: unknown }[]) =>
  articles.map((a) => a.title);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ROCK_API', 'https://rock.example.com/api/');
  vi.stubEnv('SHOW_UNAPPROVED_CONTENT', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fetchAuthorArticles', () => {
  it('requests only approved articles of this author', async () => {
    stubSearch([]);

    await fetchAuthorArticles(ALIAS_GUID);

    const { where } = sentBody();
    expect(where).toContain('Status == "Approved"');
    expect(where).toContain('ContentChannelId == 43');
    expect(where).toContain(
      `ContentChannelItemAttributeValues.Any(av => av.Key == "Author" && av.Value == "${ALIAS_GUID}")`,
    );
  });

  // An author page must not advertise articles readers can no longer open.
  it('drops scheduled and expired articles', async () => {
    stubSearch([
      article('scheduled', 'Approved', { startDateTime: FUTURE }),
      article('expired', 'Approved', {
        startDateTime: PAST,
        expireDateTime: PAST,
      }),
      article('live'),
      article('also-live'),
    ]);

    expect(titles(await fetchAuthorArticles(ALIAS_GUID))).toEqual([
      'live',
      'also-live',
    ]);
  });

  // The date range is filtered after Rock's limit, so asking for exactly six
  // would let expired articles consume slots.
  it('over-fetches so expired articles cannot shrink the feed', async () => {
    stubSearch([]);

    await fetchAuthorArticles(ALIAS_GUID);

    expect(sentBody().limit).toBeGreaterThan(6);
  });

  it('still caps the feed at six articles', async () => {
    stubSearch(Array.from({ length: 12 }, (_, i) => article(`article-${i}`)));

    const articles = await fetchAuthorArticles(ALIAS_GUID);

    expect(articles).toHaveLength(6);
    expect(articles[0].title).toBe('article-0');
  });

  // The read unwraps a lone row, including one left by the date filter.
  // Callers map over this result.
  it('wraps a lone article left after date filtering into an array', async () => {
    stubSearch([
      article('expired', 'Approved', {
        startDateTime: PAST,
        expireDateTime: PAST,
      }),
      article('only-live-one'),
    ]);

    const articles = await fetchAuthorArticles(ALIAS_GUID);

    expect(Array.isArray(articles)).toBe(true);
    expect(titles(articles)).toEqual(['only-live-one']);
  });

  it('returns an empty list when every article is out of date range', async () => {
    stubSearch([article('scheduled', 'Approved', { startDateTime: FUTURE })]);

    await expect(fetchAuthorArticles(ALIAS_GUID)).resolves.toEqual([]);
  });

  it('returns an empty list when Rock finds nothing', async () => {
    stubSearch([]);

    await expect(fetchAuthorArticles(ALIAS_GUID)).resolves.toEqual([]);
  });

  // Preview mode strips the Status clause, so the request alone can't
  // guarantee approval. An author page is a public index in every environment.
  describe('approval is enforced even when the query filter was stripped', () => {
    beforeEach(() => {
      vi.stubEnv('SHOW_UNAPPROVED_CONTENT', 'true');
    });

    it('sends no Status filter in preview mode', async () => {
      stubSearch([]);

      await fetchAuthorArticles(ALIAS_GUID);

      expect(sentBody().where).not.toContain('Status');
    });

    it('drops denied and pending articles', async () => {
      stubSearch([
        article('approved-one'),
        article('was-approved-now-denied', 'Denied'),
        article('still-a-draft', 'PendingApproval'),
      ]);

      expect(titles(await fetchAuthorArticles(ALIAS_GUID))).toEqual([
        'approved-one',
      ]);
    });

    it('returns nothing when the author has no approved articles', async () => {
      stubSearch([
        article('draft', 'PendingApproval'),
        article('rejected', 'Denied'),
      ]);

      await expect(fetchAuthorArticles(ALIAS_GUID)).resolves.toEqual([]);
    });

    it('counts the cap against approved articles only', async () => {
      stubSearch([
        ...Array.from({ length: 4 }, (_, i) =>
          article(`denied-${i}`, 'Denied'),
        ),
        ...Array.from({ length: 8 }, (_, i) => article(`approved-${i}`)),
      ]);

      const articles = await fetchAuthorArticles(ALIAS_GUID);

      expect(articles).toHaveLength(6);
      expect(articles.every((a) => a.status === 2)).toBe(true);
    });
  });
});

describe('author lookups', () => {
  it('reads an alias by Guid through the personAliases search', async () => {
    stubSearch([{ guid: ALIAS_GUID, personId: 7 }]);

    await expect(fetchAuthorId(ALIAS_GUID)).resolves.toMatchObject({
      personId: 7,
    });
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toMatch(
      /personaliases\/search\/personAliases$/,
    );
    expect(sentBody().where).toBe(`(Guid == "${ALIAS_GUID}")`);
  });

  // A v2 people search by attribute value takes 8-24s, so this one stays on v1.
  it('reads an author by pathname on v1', async () => {
    stubSearch([]);
    vi.mocked(fetchRockData).mockResolvedValue({
      id: 7,
      firstName: 'Ann',
      lastName: 'Lee',
      photo: { guid: 'photo-guid' },
    });

    await expect(getBasicAuthorInfoByPathname('ann-lee')).resolves.toEqual({
      fullName: 'Ann Lee',
      photo: { uri: 'https://cdn.example.com/photo-guid' },
      authorAttributes: { authorId: 7, pathname: 'ann-lee' },
    });
    expect(fetchRockData).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'People/GetByAttributeValue',
        queryParams: expect.objectContaining({
          attributeKey: 'Pathname',
          value: 'ann-lee',
        }),
      }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
