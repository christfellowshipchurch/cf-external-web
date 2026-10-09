import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Events',
    description:
      'Discover events at Christ Fellowship Church. Find conferences, classes, outreach, and community events near you and online.',
    path: '/events',
  });
};
