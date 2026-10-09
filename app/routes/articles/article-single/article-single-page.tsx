import { useLoaderData } from 'react-router';
import { ArticleHero } from './partials/hero.partial';
import { ArticleContent } from './partials/content.partial';
import { ArticleNewsletter } from './partials/newsletter.partial';
import { RelatedArticles } from './partials/related-articles.partial';
import { LoaderReturnType } from './loader';

export const ArticleSinglePage = () => {
  const data = useLoaderData<LoaderReturnType>();

  return (
    <section className='bg-white'>
      <ArticleHero {...data} />
      <ArticleContent htmlContent={data.content} />
      <RelatedArticles />
      <ArticleNewsletter />
    </section>
  );
};
