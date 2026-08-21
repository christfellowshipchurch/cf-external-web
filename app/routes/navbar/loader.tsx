// This loader is used to fetch the feature cards for the navbar and is stored in the root loader to be used across the app

import type { LoaderFunctionArgs } from 'react-router-dom';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
// import { fetchTopSearches } from "~/lib/.server/fetch-top-searches";
import type { FeatureCard } from '~/components/navbar/types';
import { createImageUrlFromGuid, parseRockKeyValueList } from '~/lib/utils';
import { getUserFromRequest } from '~/lib/.server/authentication/get-user-from-request';
import type { User } from '~/providers/auth-provider';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import { ContentChannelIds } from '~/lib/rock-config';
import type { RockContentChannelItem } from '~/lib/types/rock-types';
import { buildPodcastRoutingIndex } from '~/routes/podcasts/podcast-routing.server';
import type { ContentItemHit } from '~/routes/search/types';
import type { GlobalSearchLocationHit } from '~/components/navbar/search-locations';
import { fetchDefaultSearchHits } from './default-search-hits.server';
import { fetchIsOnlineServiceLive } from './live-service.server';

// Define the return type for the loader
export interface RootLoaderData {
  userData: User | null;
  ministries: {
    featureCards: FeatureCard[];
  };
  watchReadListen: {
    featureCards: FeatureCard[];
  };
  algolia: {
    ALGOLIA_APP_ID: string | undefined;
    ALGOLIA_SEARCH_API_KEY: string | undefined;
    indexes: AlgoliaIndexMap;
    auditEnabled: boolean;
  };
  /** Popular results (content users click most). From Algolia getTopHits when available; else empty and UI uses hardcoded fallback. */
  popularResults: { title: string; pathname: string }[];
  /** Desktop site search's initial-open list, before a query is typed. */
  defaultSearchHits: ContentItemHit[];
  /** Campus records fetched with default search hits and filtered locally. */
  locationSearchHits: GlobalSearchLocationHit[];
  /** contentType facet counts for navbar search filters on a blank query. */
  contentTypeFacets: Record<string, number>;
  siteBanner: {
    content: string;
    link?: string;
    ctas?: {
      title: string;
      url: string;
    }[];
  };
  /** True during the Sunday online-broadcast window; gates the navbar's Watch Live indicator. */
  isOnlineServiceLive: boolean;
}

const EMPTY_SITE_BANNER = { content: '', link: '' };

export const mapSiteBannerFromRockItem = (
  rawSiteBanner: RockContentChannelItem | null | undefined,
) => {
  const siteBannerContent =
    typeof rawSiteBanner?.content === 'string' ? rawSiteBanner.content : '';
  const callsToActions = parseRockKeyValueList(
    rawSiteBanner?.attributeValues?.callsToAction?.value ?? '',
  );

  return {
    content: siteBannerContent,
    link: callsToActions[0]?.value ?? '',
  };
};

/** Latest podcast episode found across every show's episode channel, plus the show's URL slug needed to build its link. */
interface LatestPodcastEpisode {
  episode: RockContentChannelItem;
  showPath: string;
}

/**
 * Podcast episodes live on a separate ContentChannel per show (resolved via
 * buildPodcastRoutingIndex), so "latest episode" requires querying across
 * every show's episode channel rather than a single fixed ContentChannelId.
 */
const fetchLatestPodcastEpisode =
  async (): Promise<LatestPodcastEpisode | null> => {
    try {
      const { byEpisodeChannelId } = await buildPodcastRoutingIndex();
      const channelIds = Array.from(byEpisodeChannelId.keys());

      if (channelIds.length === 0) {
        return null;
      }

      const channelFilter = channelIds
        .map((id) => `ContentChannelId eq ${id}`)
        .join(' or ');

      const latestEpisodeData = await fetchRockData({
        endpoint: 'ContentChannelItems',
        queryParams: {
          $filter: `(${channelFilter})`,
          $orderby: 'StartDateTime desc',
          $top: '1',
          loadAttributes: 'simple',
        },
        filterByDateRange: true,
        filterByStatusApproved: true,
      });

      const episode = (
        Array.isArray(latestEpisodeData)
          ? latestEpisodeData[0]
          : latestEpisodeData
      ) as RockContentChannelItem | undefined;

      const showPath = episode
        ? byEpisodeChannelId.get(String(episode.contentChannelId))?.showPath
        : undefined;

      if (!episode || !showPath) {
        return null;
      }

      return { episode, showPath };
    } catch (error) {
      console.error('Error fetching latest podcast episode:', error);
      return null;
    }
  };

/** Picks whichever of the latest article/podcast episode has the more recent startDateTime. */
const pickMostRecentContentItem = (
  article: RockContentChannelItem | undefined,
  podcast: LatestPodcastEpisode | null,
) => {
  if (!article)
    return podcast
      ? {
          ...podcast.episode,
          contentType: 'podcast' as const,
          showPath: podcast.showPath,
        }
      : null;
  if (!podcast) return { ...article, contentType: 'article' as const };

  const articleDate = new Date(article.startDateTime).getTime();
  const podcastDate = new Date(podcast.episode.startDateTime).getTime();

  return podcastDate > articleDate
    ? {
        ...podcast.episode,
        contentType: 'podcast' as const,
        showPath: podcast.showPath,
      }
    : { ...article, contentType: 'article' as const };
};

const fetchFeatureCards = async () => {
  try {
    const [latestArticleData, latestPodcastEpisode, latestSermonData] =
      await Promise.all([
        fetchRockData({
          endpoint: 'ContentChannelItems',
          queryParams: {
            $filter: `ContentChannelId eq ${ContentChannelIds.articles}`,
            $orderby: 'StartDateTime desc',
            $top: '1',
            loadAttributes: 'simple',
          },
          filterByDateRange: true,
          filterByStatusApproved: true,
        }),
        fetchLatestPodcastEpisode(),
        fetchRockData({
          endpoint: 'ContentChannelItems',
          queryParams: {
            $filter: `ContentChannelId eq 63`,
            $orderby: 'StartDateTime desc',
            $top: '1',
            loadAttributes: 'simple',
          },
          filterByDateRange: true,
          filterByStatusApproved: true,
        }),
      ]);

    const article = (
      Array.isArray(latestArticleData)
        ? latestArticleData[0]
        : latestArticleData
    ) as RockContentChannelItem | undefined;

    // A date-range-filtered fetch can come back as an empty array, which
    // `.filter(Boolean)` would keep (empty arrays are truthy) and then break
    // the card mapping below — so unwrap to a single item or undefined.
    const sermon = Array.isArray(latestSermonData)
      ? latestSermonData[0]
      : latestSermonData;

    const latestArticleOrPodcastCard = pickMostRecentContentItem(
      article,
      latestPodcastEpisode,
    );

    // TODO: remove this once we have the real data for the get involved card(s)
    const mockGetInvolvedData = {
      title: 'New to our Church?',
      subtitle: 'Learn who we are, what we believe, and how to get connected.',
      callToAction: {
        title: 'Take the Journey Class',
        url: '/events/journey',
      },
      image: 'https://rock.christfellowship.church/GetImage.ashx?id=3190466',
      navMenu: 'get involved',
    };

    return [sermon, latestArticleOrPodcastCard, mockGetInvolvedData].filter(
      Boolean,
    );
  } catch (error) {
    console.error('Error fetching feature cards:', error);
    return [];
  }
};

const fetchSiteBanner = async (): Promise<RockContentChannelItem | null> => {
  try {
    const siteBanner = await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: `ContentChannelId eq ${ContentChannelIds.siteBanner}`,
        $orderby: 'StartDateTime desc',
        $top: '1',
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
      filterByStatusApproved: true,
    });

    if (Array.isArray(siteBanner)) {
      return siteBanner[0] ?? null;
    }

    return siteBanner ?? null;
  } catch (error) {
    console.error('Error fetching site banner:', error);
    return null;
  }
};

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<RootLoaderData> {
  const algoliaIndexes = getServerAlgoliaIndexes();

  try {
    // Todo: fix user data for mobile/desktop nav menus. right now it's not returning the full user object, but is at least notifying is user is logged in or not. We will wait until the UI for the logged in experience is complete to fix this.
    const userData = await getUserFromRequest(request);

    // Handle the Response object
    let parsedUserData: User | null = null;
    if (userData instanceof Response) {
      const data = await userData.json();
      if (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'fullName' in data &&
        'email' in data &&
        'phoneNumber' in data &&
        'guid' in data &&
        'gender' in data &&
        'birthDate' in data &&
        'photo' in data
      ) {
        parsedUserData = data as User;
      }
    } else if (
      userData &&
      typeof userData === 'object' &&
      'id' in userData &&
      'fullName' in userData &&
      'email' in userData &&
      'phoneNumber' in userData &&
      'guid' in userData &&
      'gender' in userData &&
      'birthDate' in userData &&
      'photo' in userData
    ) {
      parsedUserData = userData as User;
    }

    const [
      rawFeatureCards,
      rawSiteBanner,
      navbarSearchData,
      isOnlineServiceLive,
    ] = await Promise.all([
      fetchFeatureCards(),
      fetchSiteBanner(),
      fetchDefaultSearchHits(
        algoliaIndexes.contentItems,
        algoliaIndexes.locations,
      ),
      fetchIsOnlineServiceLive(),
    ]);
    const siteBanner = mapSiteBannerFromRockItem(rawSiteBanner);

    // If the API call failed, return empty arrays
    if (
      !rawFeatureCards ||
      !Array.isArray(rawFeatureCards) ||
      rawFeatureCards.length === 0
    ) {
      // TODO: uncomment this once we have the real data for the popular searches
      // const popularSearches = await fetchTopSearches(
      //   process.env.ALGOLIA_APP_ID,
      //   process.env.ALGOLIA_ANALYTICS_API_KEY ??
      //     process.env.ALGOLIA_SEARCH_API_KEY,
      //   12,
      // );
      return {
        userData: parsedUserData,
        ministries: { featureCards: [] },
        watchReadListen: { featureCards: [] },
        algolia: {
          ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
          ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY,
          indexes: algoliaIndexes,
          auditEnabled: process.env.ALGOLIA_REQUEST_AUDIT === '1',
        },
        popularResults: [],
        ...navbarSearchData,
        siteBanner,
        isOnlineServiceLive,
      };
    }

    // Transform the raw data into FeatureCard type
    const mappedFeatureCards: FeatureCard[] = rawFeatureCards.map((card) => {
      // Hardcoding the get involved card for now
      if (card.navMenu && card.navMenu.toLowerCase() === 'get involved') {
        return card;
      }

      const attributes = card.attributeValues;

      if (card.contentType === 'podcast') {
        const episodePath =
          attributes.pathname?.value || attributes.url?.value || '';

        return {
          title: card.title || '',
          subtitle: 'New Podcast Episode',
          callToAction: {
            title: 'Listen Now',
            url: `/podcasts/${card.showPath}/${episodePath}`,
          },
          image: createImageUrlFromGuid(attributes.image?.value || ''),
          navMenu: 'media',
        };
      }

      const isArticle = card.contentType === 'article';

      return {
        title: card.title || '',
        subtitle: isArticle ? 'New Article' : 'Latest Message',
        callToAction: {
          title: isArticle ? 'Read Now' : 'Watch Now',
          url: `/${isArticle ? 'articles' : 'messages'}/${
            attributes.url?.value
          }`,
        },
        image: createImageUrlFromGuid(attributes.image?.value || ''),
        navMenu: 'media',
      };
    });

    // Sort cards into their respective menus based on the navMenu attribute
    const ministryCards = mappedFeatureCards.filter(
      (card) => card.navMenu.toLowerCase() === 'get involved',
    );
    const mediaCards = mappedFeatureCards.filter(
      (card) => card.navMenu.toLowerCase() === 'media',
    );

    // TODO: uncomment this once we have the real data for the popular searches
    // const popularSearches = await fetchTopSearches(
    //   process.env.ALGOLIA_APP_ID,
    //   process.env.ALGOLIA_ANALYTICS_API_KEY ??
    //     process.env.ALGOLIA_SEARCH_API_KEY,
    //   12
    // );

    return {
      // Navbar Data
      userData: parsedUserData,
      ministries: {
        featureCards: ministryCards,
      },
      watchReadListen: {
        featureCards: mediaCards,
      },
      algolia: {
        ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
        ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY,
        indexes: algoliaIndexes,
        auditEnabled: process.env.ALGOLIA_REQUEST_AUDIT === '1',
      },
      popularResults: [],
      ...navbarSearchData,
      // Site Banner Data
      siteBanner: siteBanner,
      isOnlineServiceLive,
    };
  } catch (error) {
    console.error('Error in navbar loader:', error);
    // Return empty arrays instead of throwing to prevent UI from breaking
    return {
      // Navbar Data
      userData: null,
      ministries: { featureCards: [] },
      watchReadListen: { featureCards: [] },
      algolia: {
        ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
        ALGOLIA_SEARCH_API_KEY: process.env.ALGOLIA_SEARCH_API_KEY,
        indexes: algoliaIndexes,
        auditEnabled: process.env.ALGOLIA_REQUEST_AUDIT === '1',
      },
      popularResults: [],
      defaultSearchHits: [],
      locationSearchHits: [],
      contentTypeFacets: {},
      siteBanner: EMPTY_SITE_BANNER,
      isOnlineServiceLive: false,
    };
  }
}
