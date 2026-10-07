import type { MetaFunction } from 'react-router';
import { loader } from './loader';
import { EventSinglePageType } from './types';
import { createMeta } from '~/lib/meta-utils';
import { generateMetaKeywords } from '~/lib/generate-meta-keywords';

export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  location,
}) => {
  const eventData = data as EventSinglePageType | undefined;
  if (!eventData) {
    return createMeta({
      title: '404 – Event Not Found',
      description: 'The event you are looking for does not exist.',
    });
  }
  const keywords = generateMetaKeywords({
    title: eventData.title,
    type: 'event',
  });
  return createMeta({
    title: eventData.title,
    description:
      eventData.subtitle ?? 'Join this event at Christ Fellowship Church.',
    image: eventData.coverImage,
    path: location.pathname,
    keywords,
  });
};
