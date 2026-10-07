import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Ministries',
    description:
      'Explore ministries at Christ Fellowship Church. Kids, students, young adults, groups, and more. Find where you belong.',
    path: '/ministries',
  });
};
