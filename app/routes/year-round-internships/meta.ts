import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Year Round Internships',
    description:
      'A year-round opportunity designed to equip and develop students for future ministry leadership through hands-on experience, intentional mentorship, and a supportive team environment.',
    path: '/year-round-internships',
  });
};
