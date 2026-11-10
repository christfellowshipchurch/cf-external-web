import type { LoaderFunction } from 'react-router';
import { fetchCampuses, type CampusOption } from '~/lib/.server/rock-campuses';
import type { DreamTeamKickoffLoaderReturnType } from './types';

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<CampusOption>({ active: true }, [
    'Name',
    'Guid',
  ]);

  const data: DreamTeamKickoffLoaderReturnType = { campuses };

  return <DreamTeamKickoffLoaderReturnType>data;
};
