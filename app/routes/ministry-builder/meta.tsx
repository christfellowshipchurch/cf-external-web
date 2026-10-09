import type { MetaFunction } from 'react-router';
import type { loader } from './loader';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  if (!data) {
    return createMeta({
      title: 'Ministry',
      description: 'Explore this ministry at Christ Fellowship Church.',
    });
  }
  const { title, content } = data;
  const ministryTitle = title?.includes('Ministry')
    ? title
    : `${title} Ministry`;
  const description = content
    ? content
        .replace(/<[^>]*>/g, '')
        .substring(0, 160)
        .trim() + (content.length > 160 ? '...' : '')
    : `Learn more about ${ministryTitle} at Christ Fellowship Church`;
  const metaTitle = title ? ministryTitle : 'Ministry';
  return createMeta({
    title: metaTitle,
    description,
    image: data.heroImage,
  });
};
