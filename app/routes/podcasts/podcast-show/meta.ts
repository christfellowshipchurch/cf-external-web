import type { MetaFunction } from 'react-router';
import type { loader } from './loader';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  location,
}) => {
  if (!data?.podcast) {
    return createMeta({
      title: 'Podcast Not Found',
      description: 'The podcast you are looking for does not exist.',
    });
  }
  const { podcast } = data;
  const description =
    typeof podcast.description === 'string'
      ? podcast.description
          .replace(/<[^>]*>/g, '')
          .substring(0, 160)
          .trim() + (podcast.description.length > 160 ? '...' : '')
      : `Listen to ${podcast.title} from Christ Fellowship Church`;
  const metaTitle = `${podcast.title} Podcast`;
  return createMeta({
    title: metaTitle,
    description,
    image: podcast.coverImage,
    path: location.pathname,
  });
};
