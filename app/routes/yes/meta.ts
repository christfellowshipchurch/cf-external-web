import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Yes – 21 Day Devotional',
    description:
      'Say yes to a 21-day devotional journey with Christ Fellowship Church. Grow in faith one day at a time.',
    path: '/yes',
  });
};
