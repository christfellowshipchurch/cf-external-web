import { LoaderFunctionArgs } from 'react-router';
import { getUserFromRequest } from '~/lib/.server/authentication/get-user-from-request';
import { fetchCampusWithDetails } from '~/lib/.server/rock-campuses';
import { dayTimes, formattedServiceTimes } from '~/lib/utils';

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

  const data = campusUrl
    ? await fetchCampusWithDetails({ url: campusUrl })
    : null;

  if (!data) {
    throw new Response('Campus not found at: /locations/' + campusUrl, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const { serviceTimes, name, location } = data;
  const address = [
    location?.street1,
    location?.city,
    location?.state,
    location?.postalCode,
  ].join(', ');

  return {
    serviceTimes: formattedServiceTimes(serviceTimes ?? ''),
    campusName: name,
    user,
    address,
    url: campusUrl,
  };
};
