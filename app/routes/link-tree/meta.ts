import type { MetaFunction } from 'react-router';
import type { loader } from './loader';

export const meta: MetaFunction<typeof loader> = ({ loaderData: data }) => {
  const linkTreeData = data && !Array.isArray(data) ? data : null;
  const title = linkTreeData?.title ?? 'Resources';
  const description =
    linkTreeData?.subtitle ??
    'Links and resources from Christ Fellowship Church.';
  return [
    { title: `${title} | Christ Fellowship Church` },
    { name: 'description', content: description },
    { property: 'og:title', content: `${title} | Christ Fellowship Church` },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
};
