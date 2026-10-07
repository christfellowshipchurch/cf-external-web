import { type MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';
import type { loader } from './loader';
import { getRockPageEmbedMetaTitle } from './rock-page.data';

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  return createMeta({
    title: getRockPageEmbedMetaTitle(data?.embed),
    description: 'Rock RMS embedded content',
    noIndex: true,
  });
};
