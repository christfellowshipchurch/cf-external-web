import { LoaderFunctionArgs } from 'react-router';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { parseRockKeyValueList } from '~/lib/utils';

import { PageBuilderSection } from '../page-builder/types';
import { RockContentChannelItem } from '~/lib/types/rock-types';

import {
  fetchChildItems,
  mapPageBuilderChildItems,
} from '../page-builder/loader';

export type LinkTreeLoaderData = {
  id: string;
  title: string;
  content: string;
  subtitle: string;
  callsToActions: Array<{ title: string; url: string }>;
  primaryCta: { title: string; url: string } | undefined;
  resourceCollections: Array<
    PageBuilderSection & { type: 'RESOURCE_COLLECTION' }
  >;
};

const fetchLinkTreePage = async (
  pathname: string,
): Promise<RockContentChannelItem> => {
  const linkTreePage = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'Url',
      $filter: "ContentChannelId eq 190 and Status eq 'Approved'",
      value: pathname,
      loadAttributes: 'simple',
    },
    filterByDateRange: true,
  });

  if (!linkTreePage || linkTreePage.length === 0) {
    throw new Response(`Link tree page not found at: /link-tree/${pathname}`, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  return linkTreePage as RockContentChannelItem;
};

export const loader = async ({
  url,
}: LoaderFunctionArgs): Promise<LinkTreeLoaderData | []> => {
  const pathname = url.href.split('/').pop();

  if (!pathname) {
    throw new Response(
      JSON.stringify({ error: 'Pathname not provided in request URL.' }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  let rockLinkTreePage: RockContentChannelItem;
  try {
    rockLinkTreePage = await fetchLinkTreePage(pathname);
  } catch (error) {
    throw new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unknown error occurred while fetching the link tree page.',
      }),
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (!rockLinkTreePage) {
    throw new Response(
      JSON.stringify({
        error: `Link tree page not found at: /link-tree/${pathname}`,
      }),
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Use the page builder loader to fetch the child items and map them to the page builder sections
  const children = await fetchChildItems(rockLinkTreePage.id);
  const collections = await mapPageBuilderChildItems(children, {
    summaryFallbackToContent: false,
  });
  // Ensure we only return resource collections
  const resourceCollections = collections.filter(
    (collection) => collection.type === 'RESOURCE_COLLECTION',
  ) as Array<PageBuilderSection & { type: 'RESOURCE_COLLECTION' }>;

  const isPrimaryCta =
    rockLinkTreePage.attributeValues?.primaryCtaCall?.value !== undefined &&
    rockLinkTreePage.attributeValues?.primaryCtaCall?.value !== '' &&
    rockLinkTreePage.attributeValues?.primaryCtaAction?.value !== undefined &&
    rockLinkTreePage.attributeValues?.primaryCtaAction?.value !== '';
  const isCallsToActions =
    rockLinkTreePage.attributeValues?.callsToAction?.value !== undefined &&
    rockLinkTreePage.attributeValues?.callsToAction?.value !== '';

  return {
    id: rockLinkTreePage.id ?? '',
    title: rockLinkTreePage.title ?? '',
    subtitle: rockLinkTreePage.attributeValues?.subtitle?.value ?? '',
    content: rockLinkTreePage.content ?? '',
    primaryCta: isPrimaryCta
      ? {
          title: rockLinkTreePage.attributeValues?.primaryCtaCall?.value ?? '',
          url: rockLinkTreePage.attributeValues?.primaryCtaAction?.value ?? '',
        }
      : undefined,
    callsToActions: isCallsToActions
      ? parseRockKeyValueList(
          rockLinkTreePage.attributeValues?.callsToAction?.value ?? '',
        ).map((item) => ({
          title: item.key,
          url: item.value,
        }))
      : [],
    resourceCollections: resourceCollections ?? [],
  };
};
