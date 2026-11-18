import { LoaderFunctionArgs } from 'react-router';
import { fetchCampusWithDetails } from '~/lib/.server/rock-campuses';
import { dayTimes, formattedServiceTimes } from '~/lib/utils';

export type LoaderReturnType = {
  serviceTimes: dayTimes[];
  campusName: string;
  address: string;
  url: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const campusUrl = url.searchParams.get('location') as string;

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
    address,
    url: campusUrl,
  };
};
