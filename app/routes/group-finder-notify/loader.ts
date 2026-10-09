import type { LoaderFunction } from 'react-router';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';

export type GroupFinderNotifyCampus = {
  id: number;
  guid: string;
  name: string;
};

export type GroupFinderNotifyLoaderData = {
  campuses: GroupFinderNotifyCampus[];
};

export const loader: LoaderFunction = async () => {
  const campuses = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: 'IsActive eq true',
      $orderby: 'Order',
      $select: 'Id, Name, Guid',
    },
  });

  return {
    campuses,
  } satisfies GroupFinderNotifyLoaderData;
};
