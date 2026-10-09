import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Search',
    description:
      'Search articles, messages, events, and more at Christ Fellowship Church.',
    path: '/search',
  });
};
