import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Messages',
    description:
      'Watch and listen to sermons and messages from Christ Fellowship Church. Biblical teaching for every stage of life.',
    path: '/messages',
  });
};
