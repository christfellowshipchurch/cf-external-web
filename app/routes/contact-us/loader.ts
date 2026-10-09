import { LoaderFunction } from 'react-router';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { ContactUsLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: 'IsActive eq true',
      $orderby: 'Order',
      $select: 'Name, Guid',
    },
  });

  const data: ContactUsLoaderReturnType = { campuses };

  return <ContactUsLoaderReturnType>data;
};
