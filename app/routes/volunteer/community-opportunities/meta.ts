import type { MetaFunction } from 'react-router-dom';

import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () =>
  createMeta({
    title: 'Volunteer In Our Community | Christ Fellowship Church',
    description:
      'Browse all community volunteer opportunities at Christ Fellowship Church.',
    path: '/volunteer/community-opportunities',
  });
