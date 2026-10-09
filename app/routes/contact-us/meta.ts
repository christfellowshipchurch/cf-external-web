import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Contact Us',
    description:
      'Have a question or need help? Contact Christ Fellowship Church and someone from our team will follow up with you.',
    path: '/contact-us',
  });
};
