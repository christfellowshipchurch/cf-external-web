import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Give',
    description:
      'Give to Christ Fellowship Church. Your generosity supports local and global ministry, outreach, and community impact.',
    path: '/give',
  });
};
