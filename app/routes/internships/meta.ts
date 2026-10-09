import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Internships',
    description:
      'Christ Fellowship Church internships. Gain ministry experience, leadership development, and hands-on training in a supportive community.',
    path: '/internships',
  });
};
