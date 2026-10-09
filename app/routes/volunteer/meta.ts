import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Volunteer',
    description:
      'Volunteer locally and globally with Christ Fellowship Church. Discover serving opportunities at church, in the community, and around the world.',
    path: '/volunteer',
  });
};
