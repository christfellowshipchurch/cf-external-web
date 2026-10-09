import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Journey Finder Sign Up',
    description:
      'Sign up for a Journey Experience at Christ Fellowship. Share a few details and we will be in touch.',
    path: '/journey-finder-sign-up',
  });
};
