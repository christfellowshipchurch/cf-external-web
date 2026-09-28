import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';
import { toRockDateTimeLiteral } from '~/lib/.server/rock-datetime';
import { RockCampuses } from '~/lib/rock-config';
import { buildPodcastRoutingIndex } from '~/routes/podcasts/podcast-routing.server';

/**
 * Resource route: serves /sitemap.xml so crawlers (and our launch parity check)
 * get a real URL inventory instead of a 404.
 *
 * URL sources are enumerated from Rock RMS — the source of truth — not hardcoded,
 * so new content appears automatically. Algolia is only a search layer, so we go
 * to Rock's ContentChannelItems directly via the existing fetchRockData util.
 *
 * Exception: studies-and-resources detail pages resolve via Algolia
 * (studies/resources index) in their route loader, not Rock directly. The sitemap
 * enumerates Rock channels 79/80 as an approximation; any Rock-approved study
 * absent from Algolia would 404. The parity check script surfaces such drift.
 *
 * Excluded on purpose: groups/classes (search-driven, no canonical per-item route),
 * mission trips / volunteer details (GUID + 301-redirect routing). These are
 * intentionally absent — the parity check surfaces any dropped legacy pages.
 *
 * Podcast episodes are enumerated via buildPodcastRoutingIndex(), which resolves
 * each show's episode ContentChannel dynamically — no hardcoded channel IDs.
 */

/** Canonical production host fallback when VITE_PUBLIC_ORIGIN is unset. */
const FALLBACK_ORIGIN = 'https://www.christfellowship.church';

/**
 * Canonical production origin for <loc>. Mirrors meta-utils' getOrigin(): uses
 * VITE_PUBLIC_ORIGIN (the same env that drives canonical/OG tags) so the sitemap
 * stays consistent with them. NEVER use the request origin — that would leak the
 * vercel.app preview host. VITE_PUBLIC_ORIGIN must be set to the production host
 * in the production deploy, or this falls back to FALLBACK_ORIGIN.
 */
function getCanonicalOrigin(): string {
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const origin = env?.VITE_PUBLIC_ORIGIN;
  const raw =
    typeof origin === 'string' && origin.trim()
      ? origin.trim()
      : FALLBACK_ORIGIN;
  return raw.replace(/\/+$/, '');
}

/**
 * Rock content channels that back a dedicated per-item route, mapped to the route
 * prefix and the (normalized, camelCase) attribute key that holds the URL slug.
 * Each entry was validated against that content type's single-item loader:
 *   - messages   app/routes/messages/message-single/loader.ts  (channel 63, 'url')
 *   - articles   app/routes/articles/article-single/loader.ts  (channel 43, 'url')
 *   - events     app/routes/events/event-single/utils.ts       (channel 186, 'url')
 *   - ministries app/routes/ministries/loader.ts               (channel 171, 'pathname')
 *   - studies    app/routes/.../studies-single/loader.tsx      (channels 79/80, 'url')
 *   - podcast shows   podcast-routing.server.ts (channel 179, 'url') → /podcasts/:show
 *   - podcast episodes resolved dynamically via buildPodcastRoutingIndex()   → /podcasts/:show/:episode
 *   - pages      app/routes/_.$path.tsx -> page-builder loader (channel 176, 'pathname')
 */
const CONTENT_SOURCES: {
  label: string;
  channelIds: number[];
  prefix: string;
  attr: string;
}[] = [
  { label: 'pages', channelIds: [176], prefix: '', attr: 'pathname' },
  { label: 'messages', channelIds: [63], prefix: '/messages', attr: 'url' },
  { label: 'articles', channelIds: [43], prefix: '/articles', attr: 'url' },
  { label: 'events', channelIds: [186], prefix: '/events', attr: 'url' },
  {
    label: 'ministries',
    channelIds: [171],
    prefix: '/ministries',
    attr: 'pathname',
  },
  {
    label: 'studies',
    channelIds: [79, 80],
    prefix: '/studies-and-resources',
    attr: 'url',
  },
  // Podcast *shows* only — episodes are resolved separately via buildPodcastRoutingIndex().
  // Date gate mirrors podcast-show/loader.tsx:98 (StartDateTime le now).
  { label: 'podcasts', channelIds: [179], prefix: '/podcasts', attr: 'url' },
];

/**
 * Code-defined hub/index routes with no Rock backing (search/finder/landing pages).
 * Content pages are NOT listed here — they come from CONTENT_SOURCES. De-duped
 * against the Rock-sourced paths below.
 */
const STATIC_ROUTES = [
  '/',
  '/messages',
  '/articles',
  '/events',
  '/locations',
  '/group-finder',
  '/class-finder',
  '/volunteer',
  '/podcasts',
  '/studies-and-resources',
  '/give',
  '/search',
];

interface RockItemLite {
  attributeValues?: Record<string, { value?: unknown } | undefined>;
}

/** Fetches every approved item in a channel, paginating until exhausted.
 *  extraFilter is ANDed with the base ContentChannelId clause (e.g. a date gate). */
async function fetchAllChannelItems(
  channelId: number,
  extraFilter?: string,
): Promise<RockItemLite[]> {
  const PAGE = 100;
  const MAX_PAGES = 100; // safety backstop (10k items/channel) against runaway loops
  const all: RockItemLite[] = [];
  const baseFilter = extraFilter
    ? `ContentChannelId eq ${channelId} and ${extraFilter}`
    : `ContentChannelId eq ${channelId}`;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: baseFilter,
        $top: String(PAGE),
        $skip: String(page * PAGE),
        loadAttributes: 'simple',
      },
      filterByStatusApproved: true,
      ttl: TTL.LONG,
    });

    const items: RockItemLite[] = Array.isArray(data)
      ? data
      : data
        ? [data]
        : [];
    all.push(...items);

    if (items.length < PAGE) break;
    if (page === MAX_PAGES - 1) {
      console.warn(
        `[sitemap] channel ${channelId} hit the ${MAX_PAGES}-page cap; some items may be omitted`,
      );
    }
  }

  return all;
}

/** "/Foo/" -> "/foo" ; "" -> "/" . Keeps the sitemap comparable to the crawler's.
 *  Each path segment is percent-encoded so slugs with spaces (or other RFC-3986
 *  reserved chars) produce valid <loc> URLs — raw spaces are rejected by crawlers. */
function normalizePath(prefix: string, slug: string): string {
  const clean = slug
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const path = prefix ? `${prefix}/${clean}` : `/${clean}`;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function loader() {
  const paths = new Set<string>(STATIC_ROUTES);
  // Mirrors the StartDateTime filters in podcast-show/loader.tsx and
  // podcast-episode/loader.tsx.
  const startedFilter = `StartDateTime le datetime'${toRockDateTimeLiteral()}'`;

  // Campuses are a fixed const, not a Url-attribute channel.
  for (const campus of RockCampuses) {
    paths.add(`/locations/${campus.pathname}`);
  }

  // Dynamic content. Each source is isolated so one failing channel can't 500
  // the whole sitemap.
  for (const source of CONTENT_SOURCES) {
    try {
      for (const channelId of source.channelIds) {
        // Podcast shows require a StartDateTime gate so future-scheduled shows
        // aren't emitted before they're live (podcast-show/loader.tsx:98).
        const extraFilter =
          source.label === 'podcasts' ? startedFilter : undefined;
        const items = await fetchAllChannelItems(channelId, extraFilter);
        for (const item of items) {
          const slug = item.attributeValues?.[source.attr]?.value;
          if (typeof slug === 'string' && slug.trim()) {
            paths.add(normalizePath(source.prefix, slug));
          }
        }
      }
    } catch (error) {
      console.error(`[sitemap] failed to enumerate ${source.label}:`, error);
    }
  }

  // Podcast episodes. buildPodcastRoutingIndex() resolves each show's episode
  // ContentChannel ID from Rock, so we don't hardcode show-specific channel IDs.
  // Slug preference: 'url' first (matches podcast-episode/loader.tsx:174 which
  // resolves via attributeKey 'Url'), falling back to 'pathname'.
  // Date gate mirrors podcast-episode/loader.tsx:173 (StartDateTime le now).
  try {
    const podcastIndex = await buildPodcastRoutingIndex();
    for (const [
      episodeChannelId,
      { showPath },
    ] of podcastIndex.byEpisodeChannelId) {
      const episodes = await fetchAllChannelItems(
        Number(episodeChannelId),
        startedFilter,
      );
      for (const ep of episodes) {
        const slug =
          (ep.attributeValues?.url?.value as string | undefined) ||
          (ep.attributeValues?.pathname?.value as string | undefined) ||
          '';
        if (slug.trim()) {
          paths.add(`/podcasts/${showPath}/${slug.trim().replace(/^\/+/, '')}`);
        }
      }
    }
  } catch (error) {
    console.error('[sitemap] failed to enumerate podcast episodes:', error);
  }

  const origin = getCanonicalOrigin();
  const urls = [...paths].sort();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `  <url><loc>${escapeXml(origin + p)}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
