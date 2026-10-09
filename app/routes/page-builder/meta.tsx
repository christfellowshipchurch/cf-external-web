import { MetaFunction } from 'react-router';
import { PageBuilderLoader } from './types';

export const meta: MetaFunction<PageBuilderLoader> = ({ loaderData: data }) => {
  if (!data) {
    return [
      { title: 'Page Not Found' },
      {
        name: 'description',
        content: "The page you're looking for could not be found.",
      },
    ];
  }

  const { title, content, heroImage } = data as PageBuilderLoader;

  // Create a description from content, truncating if too long
  const description = content
    ? content
        .replace(/<[^>]*>/g, '')
        .substring(0, 160)
        .trim() + (content.length > 160 ? '...' : '')
    : `Explore ${title} at Christ Fellowship Church`;

  return [
    { title: `${title} | Christ Fellowship Church` },
    {
      name: 'description',
      content: description,
    },
    {
      property: 'og:title',
      content: title,
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    ...(heroImage
      ? [
          {
            property: 'og:image',
            content: heroImage,
          },
          {
            property: 'og:image:alt',
            content: `${title} - Christ Fellowship Church`,
          },
        ]
      : []),
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: title,
    },
    {
      name: 'twitter:description',
      content: description,
    },
    ...(heroImage
      ? [
          {
            name: 'twitter:image',
            content: heroImage,
          },
        ]
      : []),
  ];
};
