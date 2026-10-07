import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Summer Internships',
    description:
      'Designed for college-aged young adults passionate about ministry, this hands-on experience invites you to dive into the life of our church while making a real Kingdom impact.',
    path: '/summer-internships',
  });
};
