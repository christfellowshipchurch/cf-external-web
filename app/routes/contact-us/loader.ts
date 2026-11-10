import { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import { ContactUsLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
  ]);

  const data: ContactUsLoaderReturnType = {
    campuses,
    formStartedAt: Date.now(),
  };

  return <ContactUsLoaderReturnType>data;
};
