import type { MetaFunction } from 'react-router';

import { createMeta } from '~/lib/meta-utils';

import type { LoaderReturnType } from './loader';
import { loader } from './loader';

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  const missionData = data as LoaderReturnType | undefined;
  if (!missionData) {
    return [];
  }

  const title = `${missionData.mission.title} | Volunteer | Christ Fellowship Church`;

  return createMeta({
    title,
    description:
      missionData.mission.summary
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160) ||
      'Learn about this volunteer opportunity and how you can serve with Christ Fellowship.',
    path: `/volunteer/${missionData.groupGuid}`,
  });
};
