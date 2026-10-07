import type { MetaFunction } from 'react-router';

import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () =>
  createMeta({
    title: 'Christ Fellowship Missions | Private Events',
    description: 'Browse private mission events at Christ Fellowship Church.',
    path: '/missions-private-events',
    noIndex: true,
  });
