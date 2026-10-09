import type { LoaderFunction } from 'react-router';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { DreamTeamKickoffLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: 'IsActive eq true',
      $orderby: 'Order',
      $select: 'Name, Guid',
    },
  });

  const data: DreamTeamKickoffLoaderReturnType = { campuses };

  return <DreamTeamKickoffLoaderReturnType>data;
};
