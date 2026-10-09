import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Group Finder',
    description:
      'Find a small group or community at Christ Fellowship Church. Connect with others by location, topic, or meeting time. In person and online.',
    path: '/group-finder',
  });
};
