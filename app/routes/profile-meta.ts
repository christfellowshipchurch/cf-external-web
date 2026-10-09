import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'My Profile',
    description:
      'Manage your Christ Fellowship Church profile, preferences, and account.',
    path: '/profile',
    noIndex: true,
  });
};
