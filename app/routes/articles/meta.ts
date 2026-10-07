import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Articles',
    description:
      'Read articles, devotionals, and stories from Christ Fellowship Church. Grow in faith and discover practical wisdom for everyday life.',
    path: '/articles',
  });
};
