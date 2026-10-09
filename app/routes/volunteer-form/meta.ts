import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Volunteer Application',
    description:
      'Apply to volunteer at Christ Fellowship Church. Join our team and make a difference locally and globally.',
    path: '/volunteer-form',
  });
};
