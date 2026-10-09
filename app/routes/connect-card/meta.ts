import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Connect Card',
    description:
      "Connect with Christ Fellowship Church. Share your information and we'll reach out.",
    path: '/connect-card',
  });
};
