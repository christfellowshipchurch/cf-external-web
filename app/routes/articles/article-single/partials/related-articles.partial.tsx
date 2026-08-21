import React from 'react';
import { useLoaderData } from 'react-router-dom';

import { CardCarouselSection } from '~/components/resource-carousel';
import { RelatedArticleCard } from '../components/related-article-card.components';
import { CollectionItem } from '~/routes/page-builder/types';
import { AuthorProps } from './hero.partial';
import { LoaderReturnType } from '../loader';

export function RelatedArticles() {
  const { articlePrimaryCategories, relatedArticles } =
    useLoaderData<LoaderReturnType>();
  if (!relatedArticles?.articles.length) return null;

  return (
    <CardCarouselSection
      title='Related Reading'
      description='Explore more articles that you might find interesting.'
      resources={relatedArticles.articles}
      viewMoreText='More Articles'
      viewMoreLink={`/articles?articlePrimaryCategories=${articlePrimaryCategories[0]}`}
      CardComponent={RelatedArticleCardWrapper}
    />
  );
}

// Wrapper component to adapt RelatedArticleCard to ResourceCarousel's interface
const RelatedArticleCardWrapper: React.FC<{
  resource: CollectionItem & { authorProps?: AuthorProps };
}> = ({ resource }) => {
  return (
    <RelatedArticleCard
      author={resource.authorProps}
      href={resource.pathname}
      title={resource.name}
      description={resource.summary}
      image={resource.image}
      date={resource.startDate || ''}
      readTime={resource.readTime?.toString() || '1'}
    />
  );
};
