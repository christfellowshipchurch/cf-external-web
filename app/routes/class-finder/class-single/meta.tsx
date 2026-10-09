import type { MetaFunction } from 'react-router';
import { loader } from './loader';
import { createMeta } from '~/lib/meta-utils';

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .join(' ')
    .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
}

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  if (!data) {
    return createMeta({
      title: '404 – Class Not Found',
      description: 'The class you are looking for does not exist.',
    });
  }

  const classTitle = slugToTitle(data.classUrl);

  return createMeta({
    title: classTitle,
    description: `Register for ${classTitle} at Christ Fellowship Church`,
    path: `/class-finder/${data.classUrl}`,
  });
};
