import type { MetaFunction } from 'react-router';

import { createMeta } from '~/lib/meta-utils';

import type { LoaderReturnType } from './loader';
import { loader } from './loader';

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  const pageData = data as LoaderReturnType | undefined;
  if (!pageData) return [];

  const title = `${pageData.bucket.name} | Volunteer at Church | Christ Fellowship Church`;

  return createMeta({
    title,
    description:
      pageData.bucket.description.slice(0, 160) ||
      'Find a serving role that fits you and sign up to serve with Christ Fellowship.',
    path: `/volunteer/church/${pageData.bucketGuid}`,
  });
};
