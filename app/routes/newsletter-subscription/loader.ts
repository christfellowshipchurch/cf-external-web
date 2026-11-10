import { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import { NewsletterSubscriptionLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
  ]);

  const data: NewsletterSubscriptionLoaderReturnType = {
    campuses,
  };

  return <NewsletterSubscriptionLoaderReturnType>data;
};
