import type { LoaderFunction } from 'react-router';
import { fetchCampuses } from '~/lib/.server/rock-campuses';

export type ClassInterestCampus = {
  id: number;
  guid: string;
  name: string;
};

export type ClassInterestLoaderData = {
  campuses: ClassInterestCampus[];
};

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<ClassInterestCampus>({ active: true }, [
    'Id',
    'Name',
    'Guid',
  ]);

  return {
    campuses,
  } satisfies ClassInterestLoaderData;
};
