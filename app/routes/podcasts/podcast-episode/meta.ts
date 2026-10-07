import type { MetaFunction } from 'react-router';
import type { loader } from './loader';
import { createMeta } from '~/lib/meta-utils';
import { generateMetaKeywords } from '~/lib/generate-meta-keywords';

export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  location,
}) => {
  if (!data?.episode) {
    return createMeta({
      title: 'Episode Not Found',
      description: 'The podcast episode you are looking for does not exist.',
    });
  }
  const { episode } = data;
  const summary = episode.summary?.trim() ?? '';
  const description =
    summary.length > 160
      ? summary.substring(0, 160) + '...'
      : summary ||
        `${episode.title} – ${episode.show} | Christ Fellowship Church`;
  const author = episode.author?.trim() || episode.show?.trim() || undefined;
  const keywords = generateMetaKeywords({
    title: episode.title,
    authorOrSpeaker: author,
    seriesTitle: episode.show,
    type: 'podcast',
  });
  return createMeta({
    title: `${episode.title} – ${episode.show}`,
    description,
    image: episode.coverImage,
    path: location.pathname,
    keywords,
    author,
  });
};
