import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Dream Team Kickoff Sign Up',
    description:
      'Sign up for Dream Team Kickoff at Christ Fellowship and take your next step to serve.',
    path: '/dream-team-kickoff',
  });
};
