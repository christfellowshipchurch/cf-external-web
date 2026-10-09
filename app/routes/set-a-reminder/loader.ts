import { LoaderFunctionArgs } from 'react-router';
import { getUserFromRequest } from '~/lib/.server/authentication/get-user-from-request';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { dayTimes, formattedServiceTimes } from '~/lib/utils';
import { escapeOData } from '~/lib/.server/rock-utils';

export type LoaderReturnType = {
  serviceTimes: dayTimes[];
  campusName: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  address: string;
  url: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const campusUrl = url.searchParams.get('location') as string;

  const user = (await getUserFromRequest(request)) || null;

  const data = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: `Url eq '${escapeOData(campusUrl)}'`,
      $expand: 'Location',
      loadAttributes: 'simple',
    },
  });

  if (!data || data.length === 0) {
    throw new Response('Campus not found at: /locations/' + campusUrl, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const { serviceTimes, name, location } = data;
  const address = [
    location.street1,
    location.city,
    location.state,
    location.postalCode,
  ].join(', ');

  return {
    serviceTimes: formattedServiceTimes(serviceTimes),
    campusName: name,
    user,
    address,
    url: campusUrl,
  };
};
