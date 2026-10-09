import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Daily Devotional',
    description:
      'Daily devotional from Christ Fellowship Church. Start each day with Scripture and reflection.',
    path: '/daily-devo',
  });
};
