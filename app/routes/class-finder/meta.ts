import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Class Finder',
    description:
      'Find classes at Christ Fellowship Church. Grow in faith through courses on the Bible, spiritual growth, marriage, and more. In person and online.',
    path: '/class-finder',
  });
};
