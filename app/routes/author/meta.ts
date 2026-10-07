import type { MetaFunction } from 'react-router';
import { loader } from './loader';
import { Author } from './types';
import { createMeta } from '~/lib/meta-utils';
import { sanitizeCmsHtml } from '~/lib/sanitize';

function htmlToMetaDescription(html: string) {
  return sanitizeCmsHtml(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  if (!data) {
    return createMeta({
      title: '404 – Author Not Found',
      description: 'The author you are looking for does not exist.',
    });
  }
  const author = data as Author;
  const description = htmlToMetaDescription(author.authorAttributes?.bio ?? '');

  return createMeta({
    title: author.fullName,
    description: description || 'Author at Christ Fellowship Church',
  });
};
