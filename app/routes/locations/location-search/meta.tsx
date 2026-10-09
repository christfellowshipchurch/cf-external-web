import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

const DESCRIPTION =
  'Christ Fellowship is one church with many locations across South Florida, and online—wherever you are!';

const KEYWORDS =
  'christ fellowship church locations, church locations, church locations near me, church, church near me, church in my area, churches, churches near me, christian church, non denominational church, church services near me';

export const meta: MetaFunction = () => {
  return [
    ...createMeta({
      title:
        'Christ Fellowship Church Locations | Across South Florida and Online',
      description: DESCRIPTION,
      path: '/locations',
    }),
    { name: 'keywords', content: KEYWORDS },
  ];
};
