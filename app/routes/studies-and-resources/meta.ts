import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Studies Finder',
    description: 'Find studies at Christ Fellowship Church.',
    path: '/studies-and-resources',
  });
};
