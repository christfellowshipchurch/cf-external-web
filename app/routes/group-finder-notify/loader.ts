import type { LoaderFunction } from 'react-router';
import { fetchCampuses } from '~/lib/.server/rock-campuses';

export type GroupFinderNotifyCampus = {
  id: number;
  guid: string;
  name: string;
};

export type GroupFinderNotifyLoaderData = {
  campuses: GroupFinderNotifyCampus[];
};

export const loader: LoaderFunction = async () => {
  const campuses = await fetchCampuses<GroupFinderNotifyCampus>(
    { active: true },
    ['Id', 'Name', 'Guid'],
  );

  return {
    campuses,
  } satisfies GroupFinderNotifyLoaderData;
};
