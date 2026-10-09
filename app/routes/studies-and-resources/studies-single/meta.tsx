import type { MetaFunction } from 'react-router';
import { loader } from './loader';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  if (!loaderData) {
    return createMeta({
      title: '404 – Study Not Found',
      description: 'The study you are looking for does not exist.',
    });
  }

  const { studyHit } = loaderData;

  if (!studyHit) {
    return createMeta({
      title: '404 – Study Not Found',
      description: 'The study you are looking for does not exist.',
    });
  }

  const description =
    (studyHit.summary ?? '').trim() ||
    (studyHit.description ?? '').trim() ||
    `Learn more about ${studyHit.title} at Christ Fellowship Church.`;

  return createMeta({
    title: studyHit.title,
    description,
  });
};
