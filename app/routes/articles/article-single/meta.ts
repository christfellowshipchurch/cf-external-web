import type { MetaFunction } from 'react-router';
import type { loader } from './loader';
import type { LoaderReturnType } from './loader';
import { createMeta } from '~/lib/meta-utils';
import { generateMetaKeywords } from '~/lib/generate-meta-keywords';

export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  location,
}) => {
  const articleData = data as LoaderReturnType | undefined;
  if (!articleData) {
    return createMeta({
      title: '404 – Article Not Found',
      description: 'The article you are looking for does not exist.',
    });
  }
  const keywords = generateMetaKeywords({
    title: articleData.title,
    categories: articleData.articlePrimaryCategories ?? [],
    authorOrSpeaker: articleData.author?.fullName,
    type: 'article',
  });
  return createMeta({
    title: articleData.title,
    description:
      articleData.summary ?? 'Read this article at Christ Fellowship Church.',
    image: articleData.coverImage,
    path: location.pathname,
    keywords,
    author: articleData.author?.fullName?.trim() || undefined,
    type: 'article',
  });
};
