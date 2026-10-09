import { Link } from 'react-router';
import { CardCarouselSection } from '~/components/resource-carousel';
import { cn } from '~/lib/utils';
import HtmlRenderer from '~/primitives/html-renderer';
import { CollectionItem } from '~/routes/page-builder/types';
import {
  englishGetInvolvedResources,
  onlineGetInvolvedResources,
  spanishGetInvolvedResources,
} from '../../../location-single-data';

export const GetInvolved = ({
  isOnline,
  isSpanish,
}: {
  isOnline?: boolean;
  isSpanish?: boolean;
}) => {
  const title = isSpanish ? 'Involúcrate' : 'Get Involved';

  return (
    <CardCarouselSection
      className={cn(
        'bg-[linear-gradient(to_bottom_right,#1C3647_0%,#1C3647_8%,var(--color-navy)_72%,var(--color-navy)_100%)]',
      )}
      title={title}
      carouselItemClassName='w-full basis-[75%] sm:basis-[40%] lg:basis-[22%] xl:basis-[23%] 2xl:!basis-[24.5%]'
      CardComponent={GetInvolvedCard}
      resources={
        isOnline
          ? onlineGetInvolvedResources
          : isSpanish
            ? spanishGetInvolvedResources
            : englishGetInvolvedResources
      }
      viewMoreLink='/next-steps'
      mode='dark'
    />
  );
};

const GetInvolvedCard = ({ resource }: { resource: CollectionItem }) => {
  const { name, summary, image, pathname } = resource;
  return (
    <Link
      to={pathname}
      className={cn(
        'flex flex-col p-[2px] w-full h-full overflow-hidden hover:translate-y-[-4px] transition-all duration-300 max-w-[332px] 3xl:max-w-none',
      )}
      prefetch='intent'
    >
      <img
        src={image}
        alt={name}
        className='w-full h-auto max-h-[200px] aspect-video object-cover md:max-w-[480px] md:max-h-[277px] lg:aspect-41/27 rounded-t-[8px]'
        loading='lazy'
      />

      <div className='flex-1 flex flex-col gap-4 p-6 bg-white h-fit border-x border-b border-neutral-lighter rounded-b-[8px]'>
        <div className='flex flex-col gap-2'>
          <h4 className='font-extrabold text-lg leading-tight text-pretty'>
            {name}
          </h4>

          <HtmlRenderer html={summary || ''} className='line-clamp-6' />
        </div>
      </div>
    </Link>
  );
};
