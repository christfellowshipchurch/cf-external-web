import { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import { ShareMySkillsLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
  ]);

  const data: ShareMySkillsLoaderReturnType = { campuses };

  return data;
};
