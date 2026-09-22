import { cn } from '~/lib/utils';
import { Button } from '~/primitives/button/button.primitive';
import { ResourceCard } from '~/primitives/cards/resource-card';
import { CardCarousel } from '~/components/resource-carousel';
import { CollectionItem } from '~/routes/page-builder/types';

export const CTACollectionSection = ({
  className,
  title,
  description,
  resources,
  viewMoreLink,
}: {
  className?: string;
  title: string;
  description: string;
  resources: CollectionItem[];
  viewMoreLink?: string;
}) => {
  return (
    <div className={cn('w-full content-padding', className)}>
      <div className='flex flex-col max-w-screen-content mx-auto'>
        <PageBuilderCTACollection
          title={title}
          description={description}
          resources={resources}
          viewMoreLink={viewMoreLink}
        />
      </div>
    </div>
  );
};

interface PageBuilderCTACollectionProps {
  viewMoreLink?: string;
  title: string;
  description: string;
  resources: CollectionItem[];
}

const PageBuilderCTACollection = ({
  title,
  viewMoreLink,
  description,
  resources,
}: PageBuilderCTACollectionProps) => {
  return (
    <div className='w-full flex justify-center'>
      <div className='w-full flex flex-col items-center py-16 md:py-24 lg:py-28'>
        {/* Header */}
        <div className='w-full flex items-end justify-between'>
          <div className='flex flex-col gap-2'>
            <h2 className='heading-section text-text-primary'>{title}</h2>
            <p className='md:text-lg'>{description}</p>
          </div>

          {viewMoreLink && (
            <Button
              href={viewMoreLink}
              size='md'
              className='hidden md:block'
              intent='secondary'
            >
              View All
            </Button>
          )}
        </div>

        <div
          className={cn(
            'hidden md:grid',
            'w-full',
            'mt-20',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            'gap-x-6 gap-y-12 md:gap-x-8 md:gap-y-16 lg:gap-x-8 lg:gap-y-16 xl:gap-x-12 xl:gap-y-20',
          )}
        >
          {resources.slice(0, 6).map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className='md:hidden'>
          <CardCarousel resources={resources} />
        </div>

        {viewMoreLink && (
          <div className='w-full flex justify-start mt-8'>
            <Button
              href={viewMoreLink}
              size='md'
              className='md:hidden'
              intent='secondary'
            >
              View All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
