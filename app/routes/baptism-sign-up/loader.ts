import { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import { BaptismSignUpLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
  ]);

  const data: BaptismSignUpLoaderReturnType = {
    campuses: campuses,
  };

  return <BaptismSignUpLoaderReturnType>data;
};
