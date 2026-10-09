import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Podcasts',
    description:
      'Listen to podcasts from Christ Fellowship Church. Teaching, interviews, and stories for your faith journey.',
    path: '/podcasts',
  });
};
