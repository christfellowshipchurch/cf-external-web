import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Sign In',
    description:
      'Sign in to your Christ Fellowship Church account to manage your profile and preferences.',
    path: '/auth',
    noIndex: true,
  });
};
